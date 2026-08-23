import "dotenv";

function parseProviderOrder(env: string | undefined): string[] {
    return (env || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
}

function parseAllowFallbacks(env: string | undefined): boolean {
    return env?.toLowerCase() !== "false";
}

export const config = {
    matrix: {
        homeserverUrl: Deno.env.get("MATRIX_HOMESERVER_URL") || "",
        username: Deno.env.get("MATRIX_USERNAME") || "",
        password: Deno.env.get("MATRIX_PASSWORD") || "",
        roomId: Deno.env.get("MATRIX_ROOM_ID") || "",
        roomLanguage: Deno.env.get("MATRIX_ROOM_LANGUAGE") || "English",
    },
    openai: {
        apiKey: Deno.env.get("OPENAI_API_KEY") || "",
        apiUrl: Deno.env.get("OPENAI_API_URL") || "https://api.openai.com/v1",
        textModel: Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-3.5-turbo",
        visionModel: Deno.env.get("OPENAI_VISION_MODEL") ||
            "gpt-4-vision-preview",
        textModelProviderOrder: parseProviderOrder(
            Deno.env.get("OPENAI_TEXT_MODEL_PROVIDER_ORDER"),
        ),
        visionModelProviderOrder: parseProviderOrder(
            Deno.env.get("OPENAI_VISION_MODEL_PROVIDER_ORDER"),
        ),
        textModelAllowFallbacks: parseAllowFallbacks(
            Deno.env.get("OPENAI_TEXT_MODEL_PROVIDER_ALLOW_FALLBACKS"),
        ),
        visionModelAllowFallbacks: parseAllowFallbacks(
            Deno.env.get("OPENAI_VISION_MODEL_PROVIDER_ALLOW_FALLBACKS"),
        ),
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
    debugMode: Deno.env.get("DEBUG_MODE")?.toLowerCase() === "true",
};
