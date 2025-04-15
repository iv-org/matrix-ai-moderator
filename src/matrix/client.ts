import { createClient } from "npm:matrix-js-sdk";
import { config } from "../config.ts";

// Initialize Matrix client
export const matrixClient = createClient({
  baseUrl: config.matrix.homeserverUrl,
  accessToken: "", // Will be set after login
  userId: config.matrix.username,
}); 