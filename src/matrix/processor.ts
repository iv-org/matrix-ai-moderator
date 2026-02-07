import { matrixClient } from "./client.ts";
import { config } from "../config.ts";
import { isMessageInappropriate } from "../checks/message.ts";
import { analyzeImage } from "../checks/image.ts";
import { isPollInappropriate, pollContentToText } from "../checks/poll.ts";
import { kv } from "../storage.ts";
import { MatrixEvent, MsgType, Room } from "matrix-js-sdk";
import { log } from "../logger.ts";
import { delay, withRateLimit } from "./utils.ts";
import {
    deleteAllUserMessages,
    deletionQueue,
    isMessageStillPresent,
} from "./deletion.ts";
import { fallbackUnsafeText } from "../checks/fallback.ts";

export async function processMessage(event: MatrixEvent, room: Room) {
    const sender = event.getSender();
    if (!sender) return;

    const content = event.getContent();

    // Skip messages sent by the bot itself or containing warning text
    if (
        sender === config.matrix.username ||
        sender ===
            `${config.matrix.username}:${
                config.matrix.homeserverUrl.split("://")[1]
            }` ||
        (content.msgtype === "m.text" &&
            content.body.includes("Your message has been deleted"))
    ) {
        log.debug("Skipping bot message or warning message");
        return;
    }

    // Only check messages that are newer than when the bot started
    const messageTimestamp = event.getTs();
    const botStartTime = (await kv.get(["bot_start_time"])).value as number;

    if (messageTimestamp <= botStartTime) {
        log.debug("Skipping old message from:", sender);
        return;
    }

    if (
        event.getType() === "m.room.message" ||
        event.getType() === "m.poll.start" ||
        event.getType() === "org.matrix.msc3381.poll.start" ||
        event.getType() === "m.sticker" ||
        event.getType() === "m.room.avatar"
    ) {
        // In debug mode, check all messages. Otherwise, only check new members
        const isNewMember = await kv.get(["new_members", sender]);
        const shouldCheck = config.debugMode || isNewMember.value !== null;

        if (shouldCheck) {
            let inappropriate = false;

            if (content.msgtype === "m.text") {
                // Skip short messages
                if (content.body.length < config.checks.minMessageLength) {
                    log.debug("Skipping short message from:", sender);
                    return;
                }

                // Check if message is still present before processing
                if (!await isMessageStillPresent(event.getId()!)) {
                    log.debug(
                        "Message was already deleted, skipping:",
                        event.getId(),
                    );
                    return;
                }

                inappropriate = await isMessageInappropriate(content.body);

                if (!inappropriate && fallbackUnsafeText(content.body)) {
                    log.warn(
                        "Fallback filter flagged message despite LLM approval",
                        { sender, eventId: event.getId() },
                    );
                    inappropriate = true;
                }
            } else if (
                content.msgtype === "m.image" || event.getType() === "m.sticker"
            ) {
                const imageUrl = content.url;
                if (imageUrl) {
                    // Check if message is still present before processing
                    if (!await isMessageStillPresent(event.getId()!)) {
                        log.debug(
                            event.getType() === "m.sticker"
                                ? "Sticker was already deleted, skipping:"
                                : "Image message was already deleted, skipping:",
                            event.getId(),
                        );
                        return;
                    }

                    inappropriate = await analyzeImage(imageUrl, matrixClient);
                    // For images, always ban immediately if inappropriate
                    if (inappropriate) {
                        // Ban the user immediately
                        if (config.debugMode) {
                            log.warn(
                                "[DEBUG] Would ban user for explicit image content:",
                                sender,
                            );
                        } else {
                            log.warn(
                                "Banning user for explicit image content:",
                                sender,
                            );
                            await withRateLimit(() =>
                                matrixClient.ban(
                                    room.roomId,
                                    sender,
                                    "Automoderator: Explicit image content",
                                )
                            );
                        }

                        // Remove the user from KV storage
                        await kv.delete(["new_members", sender]);
                        await kv.delete(["warnings", sender]);

                        await delay(10000);

                        // Add message deletion to queue
                        deletionQueue.add(() =>
                            deleteAllUserMessages(room.roomId, sender)
                        );
                        return;
                    }
                }
            } else if (
                event.getType() === "m.poll.start" ||
                event.getType() === "org.matrix.msc3381.poll.start"
            ) {
                // Check if message is still present before processing
                if (!await isMessageStillPresent(event.getId()!)) {
                    log.debug(
                        "Poll was already deleted, skipping:",
                        event.getId(),
                    );
                    return;
                }

                // Pass the entire content to the poll checker
                // It will handle both stable (m.poll) and unstable (org.matrix.msc3381.poll.start) formats
                const pollText = pollContentToText(content);
                inappropriate = await isPollInappropriate(content);
                if (
                    !inappropriate && pollText && fallbackUnsafeText(pollText)
                ) {
                    log.warn(
                        "Fallback filter flagged poll text despite LLM approval",
                        { sender, eventId: event.getId() },
                    );
                    inappropriate = true;
                }
            } else if (event.getType() === "m.room.avatar") {
                // Check if event is still present before processing
                if (!await isMessageStillPresent(event.getId()!)) {
                    log.debug(
                        "Room avatar change was already deleted, skipping:",
                        event.getId(),
                    );
                    return;
                }

                // Check room avatar image
                const avatarUrl = content.url;
                if (avatarUrl) {
                    inappropriate = await analyzeImage(avatarUrl, matrixClient);
                    // For room avatar, always ban immediately if inappropriate
                    if (inappropriate) {
                        // Ban the user immediately
                        if (config.debugMode) {
                            log.warn(
                                "[DEBUG] Would ban user for inappropriate room avatar:",
                                sender,
                            );
                        } else {
                            log.warn(
                                "Banning user for inappropriate room avatar:",
                                sender,
                            );
                            await withRateLimit(() =>
                                matrixClient.ban(
                                    room.roomId,
                                    sender,
                                    "Automoderator: Inappropriate room avatar",
                                )
                            );
                        }

                        // Remove the user from KV storage
                        await kv.delete(["new_members", sender]);
                        await kv.delete(["warnings", sender]);

                        await delay(10000);

                        // Add message deletion to queue
                        deletionQueue.add(() =>
                            deleteAllUserMessages(room.roomId, sender)
                        );
                        return;
                    }
                }
            }

            if (inappropriate) {
                // Delete the message
                await withRateLimit(() =>
                    matrixClient.redactEvent(room.roomId, event.getId()!)
                );

                // Check if user is still being monitored
                const isMonitored = await kv.get(["new_members", sender]);
                if (!isMonitored.value) {
                    log.debug(
                        "User is no longer being monitored, skipping warning:",
                        sender,
                    );
                    return;
                }

                // Check if this is the first or second warning
                const warningCount = await kv.get(["warnings", sender]);
                if (warningCount.value === null) {
                    // First warning
                    const username = sender.split(":")[0].slice(1);
                    const warningMessage = `
            @${username}:
            Please refrain from sending such content in the future.
            This is your last warning before being banned.
          `.trim();

                    await withRateLimit(() =>
                        matrixClient.sendMessage(room.roomId, {
                            msgtype: MsgType.Text,
                            body: warningMessage,
                            format: "org.matrix.custom.html",
                            formatted_body: `
              <a href="https://matrix.to/#/${sender}">@${username}</a>:
              Please refrain from sending such content in the future.
              This is your last warning before being banned.
            `.trim(),
                        })
                    );

                    // Store the warning
                    await kv.set(["warnings", sender], 1, {
                        expireIn: 24 * 60 * 60 * 1000, // 24 hours expiration
                    });

                    await delay(5000);

                    // Add message deletion to queue
                    deletionQueue.add(() =>
                        deleteAllUserMessages(room.roomId, sender)
                    );
                } else {
                    // Second warning - ban the user
                    if (config.debugMode) {
                        log.warn(
                            "[DEBUG] Would ban user for inappropriate message:",
                            sender,
                        );
                    } else {
                        log.warn(
                            "Banning user for inappropriate message:",
                            sender,
                        );

                        // Remove the user from KV storage
                        await kv.delete(["new_members", sender]);
                        await kv.delete(["warnings", sender]);

                        await withRateLimit(() =>
                            matrixClient.ban(
                                room.roomId,
                                sender,
                                "Automoderator: Inappropriate content after warning",
                            )
                        );
                    }

                    await delay(5000);

                    // Add message deletion to queue
                    deletionQueue.add(() =>
                        deleteAllUserMessages(room.roomId, sender)
                    );
                }
            } else {
                // Message is appropriate, check if user has any warnings
                const warningCount = await kv.get(["warnings", sender]);
                if (warningCount.value === null) {
                    // Only count valid messages if user has no warnings
                    const validMessages = await kv.get([
                        "valid_messages",
                        sender,
                    ]);
                    const currentCount =
                        (validMessages.value as number | null) ?? 0;
                    await kv.set(["valid_messages", sender], currentCount + 1);

                    // Check if user has passed the required number of valid messages
                    if (
                        currentCount + 1 >= config.checks.requiredValidMessages
                    ) {
                        log.debug(
                            "User has passed required valid messages threshold, removing from monitoring:",
                            sender,
                        );
                        await kv.delete(["new_members", sender]);
                        await kv.delete(["valid_messages", sender]);
                    }
                }
            }
        }
    }
}
