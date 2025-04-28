import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";

export async function isUsernameInappropriate(
    username: string,
): Promise<boolean> {
    const messages = [
        {
            role: "system",
            content:
                `You are a content moderator. Only check usernames that are in ${config.matrix.roomLanguage}. If the username contains offensive or sexual content, respond with exactly 'true'. If it is appropriate, respond with exactly 'false'. Do not include any other text in your response.`,
        },
        {
            role: "user",
            content: username,
        },
    ];
    const response = await callOpenAIAPI(messages, config.openai.textModel);
    return response.toLowerCase() === "true";
}
