import { matrixClient } from "./client.ts";
import { config } from "../config.ts";
import { isUsernameInappropriate } from "../checks/username.ts";
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

                // Check if username is inappropriate
                const inappropriate = await isUsernameInappropriate(displayName);

                if (inappropriate) {
                    // Ban the member
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

                    // Remove the user from KV storage
                    await kv.delete(["new_members", userId]);
                    await kv.delete(["warnings", userId]);
                } else {
                    // Store the member in KV with configurable expiration
                    await kv.set(["new_members", userId], true, {
                        expireIn: config.checks.newMemberCheckDurationHours *
                            60 * 60 * 1000,
                    });
                }
            }
        },
    );
}
