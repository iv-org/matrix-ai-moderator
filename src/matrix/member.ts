import { matrixClient } from "./client.ts";
import { config } from "../config.ts";
import { isUsernameInappropriate } from "../checks/username.ts";
import { kv } from "../storage.ts";
import { RoomMemberEvent, MatrixEvent, RoomMember } from "matrix-js-sdk";
import { log } from "../logger.ts";

export function setupMemberHandler() {
  matrixClient.on(RoomMemberEvent.Membership, async (event: MatrixEvent, member: RoomMember) => {
    if (member.roomId !== config.matrix.roomId) return;
    
    // Only check members that joined after the bot started
    const joinTimestamp = event.getTs();
    const botStartTime = (await kv.get(["bot_start_time"])).value as number;
    
    if (joinTimestamp <= botStartTime) {
      log.debug('Skipping old member join:', member.userId);
      return;
    }
    
    if (member.membership === "join") {
      const username = member.userId;
      
      // Check if username is inappropriate
      const inappropriate = await isUsernameInappropriate(username);
      
      if (inappropriate) {
        // Ban the member
        log.warn('Banning user:', username, 'from room:', config.matrix.roomId);
        await matrixClient.ban(config.matrix.roomId, username, "Inappropriate username");
        
        // Remove the user from KV storage
        await kv.delete(["new_members", username]);
        await kv.delete(["warnings", username]);
      } else {
        // Store the member in KV with configurable expiration
        await kv.set(["new_members", username], true, { 
          expireIn: config.checks.newMemberCheckDurationHours * 60 * 60 * 1000 
        });
      }
    }
  });
} 