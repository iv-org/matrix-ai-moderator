import "dotenv";

export const config = {
    matrix: {
        homeserverUrl: Deno.env.get("MATRIX_HOMESERVER_URL") || "",
        username: Deno.env.get("MATRIX_USERNAME") || "",
        password: Deno.env.get("MATRIX_PASSWORD") || "",
        roomId: Deno.env.get("MATRIX_ROOM_ID") || "",
    },
    openai: {
        apiKey: Deno.env.get("OPENAI_API_KEY") || "",
        apiUrl: Deno.env.get("OPENAI_API_URL") || "https://api.openai.com/v1",
        textModel: Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-3.5-turbo",
        visionModel: Deno.env.get("OPENAI_VISION_MODEL") ||
            "gpt-4-vision-preview",
    },
    checks: {
        newMemberCheckDurationHours: parseInt(
            Deno.env.get("CHECKS_NEW_MEMBER_DURATION_HOURS") || "60",
        ),
        requiredValidMessages: parseInt(
            Deno.env.get("CHECKS_REQUIRED_VALID_MESSAGES") || "5",
        ),
        minMessageLength: parseInt(
            Deno.env.get("CHECKS_MIN_MESSAGE_LENGTH") || "10",
        ),
    },
    logger: {
        minLevel: Deno.env.get("LOG_LEVEL") || "info",
    },
};
