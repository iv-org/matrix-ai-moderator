import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";
import { log } from "../logger.ts";
import {
    buildJsonUserPrompt,
    buildSystemPrompt,
    MODERATION_RESPONSE_FORMAT,
    parseModerationResponse,
} from "../openai/prompt.ts";

export async function isUsernameInappropriate(
    username: string,
): Promise<boolean> {
    const systemPrompt = buildSystemPrompt(
        `Only check usernames that are in ${config.matrix.roomLanguage}. If the username contains clearly offensive or explicitly sexual language (such as slurs, hate speech, or sexually explicit terms), respond with 'true'. If it is appropriate, respond with 'false'.`,
    );
    const userPrompt = buildJsonUserPrompt(
        "Look at the `username` value and set unsafe=true when it violates these rules.",
        { username, language: config.matrix.roomLanguage },
    );

    const response = await callOpenAIAPI(
        [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        config.openai.textModel,
        { responseFormat: MODERATION_RESPONSE_FORMAT },
    );

    const result = parseModerationResponse(response);
    if (!result.valid) {
        log.warn("Invalid moderation response for username", { response });
    }
    return result.unsafe;
}
