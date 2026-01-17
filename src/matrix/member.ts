import { matrixClient } from "./client.ts";
import { config } from "../config.ts";
import { isUsernameInappropriate } from "../checks/username.ts";
import { analyzeAvatar } from "../checks/avatar.ts";
import { kv } from "../storage.ts";
import { MatrixEvent, RoomMember, RoomMemberEvent } from "matrix-js-sdk";
import { log } from "../logger.ts";

export function setupMemberHandler() {
    matrixClient.on(
        RoomMemberEvent.Membership,
        async (event: MatrixEvent, member: RoomMember) => {
            if (member.roomId !== config.matrix.roomId) return;

            // Only check members that joined after the bot started
            const joinTimestamp = event.getTs();
            const botStartTime = (await kv.get(["bot_start_time"]))
                .value as number;

            if (joinTimestamp <= botStartTime) {
                log.debug("Skipping old member join:", member.userId);
                return;
            }

            if (member.membership === "join") {
                const displayName = member.name;
                const userId = member.userId;
                const avatarUrl = member.getAvatarUrl(
                    config.matrix.homeserverUrl,
                    100,
                    100,
                    "scale",
                    false,
                    false,
                );

                // Check if username is inappropriate
                const usernameInappropriate = await isUsernameInappropriate(displayName);

                if (usernameInappropriate) {
                    // Ban the member
                    if (config.debugMode) {
                        log.warn(
                            "[DEBUG] Would ban userId",
                            userId,
                            "for inappropriate username:",
                            displayName
                        );
                    } else {
                        log.warn(
                            "Banning userId",
                            userId,
                            "for inappropriate username:",
                            displayName
                        );
                        await matrixClient.ban(
                            config.matrix.roomId,
                            userId,
                            "Automoderator: Inappropriate username",
                        );
                    }

                    // Remove the user from KV storage
                    await kv.delete(["new_members", userId]);
                    await kv.delete(["warnings", userId]);
                    return;
                }

                // Check if avatar is inappropriate (if user has an avatar)
                if (avatarUrl) {
                    log.debug("Checking avatar for user:", userId);
                    const avatarInappropriate = await analyzeAvatar(avatarUrl, matrixClient);

                    if (avatarInappropriate) {
                        // Ban the member
                        if (config.debugMode) {
                            log.warn(
                                "[DEBUG] Would ban userId",
                                userId,
                                "for inappropriate avatar"
                            );
                        } else {
                            log.warn(
                                "Banning userId",
                                userId,
                                "for inappropriate avatar"
                            );
                            await matrixClient.ban(
                                config.matrix.roomId,
                                userId,
                                "Automoderator: Inappropriate avatar",
                            );
                        }

                        // Remove the user from KV storage
                        await kv.delete(["new_members", userId]);
                        await kv.delete(["warnings", userId]);
                        return;
                    }
                }

                // Store the member in KV with configurable expiration
                await kv.set(["new_members", userId], true, {
                    expireIn: config.checks.newMemberCheckDurationHours *
                        60 * 60 * 1000,
                });
            }
        },
    );
}
