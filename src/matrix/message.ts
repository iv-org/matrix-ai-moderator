import { matrixClient } from "./client.ts";
import { config } from "../config.ts";
import { isMessageInappropriate } from "../checks/message.ts";
import { analyzeImage } from "../checks/image.ts";
import { kv } from "../storage.ts";
import { MsgType, RoomEvent, MatrixEvent, Room, IRoomTimelineData } from "npm:matrix-js-sdk";

export function setupMessageHandler() {
  matrixClient.on(RoomEvent.Timeline, async (event: MatrixEvent, room: Room | undefined, _toStartOfTimeline: boolean | undefined, _removed: boolean, _data: IRoomTimelineData) => {
    if (!room || room.roomId !== config.matrix.roomId) return;
    
    const sender = event.getSender();
    if (!sender) return;
    
    const content = event.getContent();
    
    // Skip messages sent by the bot itself or containing warning text
    if (sender === config.matrix.username || 
        sender === `${config.matrix.username}:${config.matrix.homeserverUrl.split('://')[1]}` ||
        (content.msgtype === "m.text" && content.body.includes("Your message has been deleted"))) {
      console.log('Skipping bot message or warning message');
      return;
    }
    
    // Only check messages that are newer than when the bot started
    const messageTimestamp = event.getTs();
    const botStartTime = (await kv.get(["bot_start_time"])).value as number;
    
    if (messageTimestamp <= botStartTime) {
      console.log('Skipping old message from:', sender);
      return;
    }
    
    if (event.getType() === "m.room.message") {
      // Check if sender is in the new members list
      const isNewMember = await kv.get(["new_members", sender]);
      
      if (isNewMember.value !== null) {
        let inappropriate = false;
        
        if (content.msgtype === "m.text") {
          inappropriate = await isMessageInappropriate(content.body);
        } else if (content.msgtype === "m.image") {
          const imageUrl = content.url;
          if (imageUrl) {
            inappropriate = await analyzeImage(imageUrl, matrixClient);
          }
        }
        
        if (inappropriate) {
          // Delete the message
          await matrixClient.redactEvent(room.roomId, event.getId()!);
          
          // Check if this is the first or second warning
          const warningCount = await kv.get(["warnings", sender]);
          if (warningCount.value === null) {
            // First warning
            const username = sender.split(':')[0].slice(1);
            const warningMessage = `
              @${username}:
              Your message has been deleted for containing inappropriate content.
              Please refrain from sending such content in the future.
              This is your last warning before being banned.
            `.trim();

            await matrixClient.sendMessage(room.roomId, {
              msgtype: MsgType.Text,
              body: warningMessage,
              format: "org.matrix.custom.html",
              formatted_body: `
                <a href="https://matrix.to/#/${sender}">@${username}</a>:
                Your message has been deleted for containing inappropriate content.
                Please refrain from sending such content in the future.
                This is your last warning before being banned.
              `.trim()
            });
            
            // Store the warning
            await kv.set(["warnings", sender], 1, { 
              expireIn: 24 * 60 * 60 * 1000 // 24 hours expiration
            });
          } else {
            // Second warning - ban the user
            console.log('Banning user:', sender, 'from room:', room.roomId);
            await matrixClient.ban(room.roomId, sender, "Inappropriate content after warning");
            // Remove the user from KV storage
            await kv.delete(["new_members", sender]);
            await kv.delete(["warnings", sender]);
          }
        } else {
          // Message passed checks - increment counter
          const validMessagesCount = await kv.get(["valid_messages", sender]);
          const newCount = (validMessagesCount.value as number || 0) + 1;
          
          if (newCount >= config.checks.requiredValidMessages) {
            // User has sent enough valid messages, remove from checks
            console.log('User', sender, 'has sent', config.checks.requiredValidMessages, 'valid messages, removing from checks');
            await kv.delete(["new_members", sender]);
            await kv.delete(["valid_messages", sender]);
            await kv.delete(["warnings", sender]);
          } else {
            // Store updated count
            await kv.set(["valid_messages", sender], newCount);
          }
        }
      }
    }
  });
} 