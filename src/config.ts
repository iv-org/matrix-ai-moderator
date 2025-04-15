import { load } from "https://deno.land/std@0.200.0/dotenv/mod.ts";

// Load environment variables
const env = await load();

export const config = {
  matrix: {
    homeserverUrl: env.MATRIX_HOMESERVER_URL,
    username: env.MATRIX_USERNAME,
    password: env.MATRIX_PASSWORD,
    roomId: env.MATRIX_ROOM_ID,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
    apiUrl: env.OPENAI_API_URL,
    textModel: env.OPENAI_TEXT_MODEL,
    visionModel: env.OPENAI_VISION_MODEL,
  },
  checks: {
    newMemberCheckDurationHours: parseInt(env.CHECKS_NEW_MEMBER_DURATION_HOURS || "60"),
    requiredValidMessages: parseInt(env.CHECKS_REQUIRED_VALID_MESSAGES || "5"),
  },
}; 