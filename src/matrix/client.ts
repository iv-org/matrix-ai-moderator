import { createClient } from "matrix-js-sdk";
import loglevel from "npm:loglevel";
import { config } from "../config.ts";
import { log } from "../logger.ts";
loglevel.getLogger("matrix").disableAll();

// Create a wrapper logger that implements the matrix-js-sdk logger interface
const matrixLogger = {
    error: (message: string, ...args: unknown[]) => log.error(message, ...args),
    warn: (message: string, ...args: unknown[]) => log.warn(message, ...args),
    info: (message: string, ...args: unknown[]) => log.info(message, ...args),
    debug: (message: string, ...args: unknown[]) => log.debug(message, ...args),
    trace: (message: string, ...args: unknown[]) => log.debug(message, ...args), // map trace to debug
    log: (message: string, ...args: unknown[]) => log.info(message, ...args), // map log to info
    getChild: (_name: string) => matrixLogger, // return the same logger instance
};

// Initialize Matrix client
export const matrixClient = createClient({
    baseUrl: config.matrix.homeserverUrl,
    accessToken: "", // Will be set after login
    userId: config.matrix.username,
    logger: matrixLogger,
});
