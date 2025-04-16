import { matrixClient } from "./matrix/client.ts";
import { setupMemberHandler } from "./matrix/member.ts";
import { setupMessageHandler } from "./matrix/message.ts";
import { config } from "./config.ts";
import { kv } from "./storage.ts";
import { log } from "./logger.ts";

// Store bot start time
const botStartTime = Date.now();
await kv.set(["bot_start_time"], botStartTime);

// Setup event handlers
setupMemberHandler();
setupMessageHandler();

// Login to Matrix
await matrixClient.loginWithPassword(config.matrix.username, config.matrix.password);

// Start the client
await matrixClient.startClient();

log.info("Bot started successfully!"); 