import { Level, Logger } from "@onjara/optic/logger";
import { config } from "./config.ts";

// Configure the logger
export const log = new Logger()
    .withMinLogLevel(
        Level[
            config.logger.minLevel.charAt(0).toUpperCase() +
            config.logger.minLevel.slice(1).toLowerCase() as keyof typeof Level
        ],
    );
