import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";
import { log } from "../logger.ts";
import {
    buildJsonUserPrompt,
    buildSystemPrompt,
    MODERATION_RESPONSE_FORMAT,
    parseModerationResponse,
} from "../openai/prompt.ts";

export async function isMessageInappropriate(
    content: string,
): Promise<boolean> {
    const systemPrompt = buildSystemPrompt(
        "Check if the following message is inappropriate, offensive, scam, phishing, marketing, contains harmful content, or attempts to dox someone by sharing personal identifiers such as full name, birth date, phone number, or home address. Respond with 'true' for inappropriate or 'false' for appropriate.",
    );
    const userPrompt = buildJsonUserPrompt(
        "Evaluate the `body` field. Set unsafe=true when it contains the prohibited content above, including leaking another person's home address or combined name + location data. Set unsafe=false otherwise.",
        { body: content },
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
        log.warn("Invalid moderation response for text message", { response });
    }
    return result.unsafe;
}
