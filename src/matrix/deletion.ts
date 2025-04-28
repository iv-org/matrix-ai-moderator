import { matrixClient } from "./client.ts";
import { kv } from "../storage.ts";
import { log } from "../logger.ts";
import { delay, withRateLimit } from "./utils.ts";
import PQueue from "p-queue";

// Queue for message deletion operations
export const deletionQueue = new PQueue({
    concurrency: 1,
});

// Check if message was already deleted
export async function isMessageStillPresent(eventId: string): Promise<boolean> {
    try {
        const wasDeleted = await kv.get(["deleted_messages", eventId]);
        return wasDeleted.value === null;
    } catch (error) {
        log.error("Error checking if message was deleted:", error);
        return false;
    }
}

export async function deleteAllUserMessages(roomId: string, userId: string) {
    try {
        const room = matrixClient.getRoom(roomId);
        if (!room) {
            log.error("Room not found:", roomId);
            return;
        }

        // Get all messages from the user in the current timeline
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();

        // Filter messages from the user
        const userEvents = events.filter((event) =>
            event.getSender() === userId &&
            event.getType() === "m.room.message"
        );

        // Delete messages in reverse order
        for (let i = userEvents.length - 1; i >= 0; i--) {
            const event = userEvents[i];
            const eventId = event.getId()!;

            // Check if message was already deleted
            const wasDeleted = await kv.get(["deleted_messages", eventId]);
            if (wasDeleted.value !== null) {
                log.debug("Message was already deleted, skipping:", eventId);
                continue;
            }

            try {
                await withRateLimit(() =>
                    matrixClient.redactEvent(roomId, eventId)
                );

                // Log full message content
                const content = event.getContent();
                const messageContent = content.msgtype === "m.text"
                    ? content.body
                    : `[${content.msgtype}] ${content.url || ""}`;

                log.info("Deleted message from user:", {
                    eventId: eventId,
                    content: messageContent,
                    timestamp: new Date(event.getTs()).toISOString(),
                });

                // Store deleted message ID with 1-hour expiration
                await kv.set(["deleted_messages", eventId], true, {
                    expireIn: 60 * 60 * 1000, // 1 hour
                });

                // Add a delay between deletions
                await delay(5000);
            } catch (error) {
                log.error("Failed to delete message:", eventId, error);
            }
        }
    } catch (error) {
        log.error("Error deleting user messages:", error);
    }
}
