import { matrixClient } from "./client.ts";
import { config } from "../config.ts";
import { IRoomTimelineData, MatrixEvent, Room, RoomEvent } from "matrix-js-sdk";
import { processMessage } from "./processor.ts";

export function setupMessageHandler() {
    matrixClient.on(
        RoomEvent.Timeline,
        (
            event: MatrixEvent,
            room: Room | undefined,
            _toStartOfTimeline: boolean | undefined,
            _removed: boolean,
            _data: IRoomTimelineData,
        ) => {
            if (!room || room.roomId !== config.matrix.roomId) return;

            // Process message immediately
            processMessage(event, room);
        },
    );
}
