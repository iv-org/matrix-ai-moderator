import OpenAI from "openai";
import { config } from "../config.ts";
import { log } from "../logger.ts";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: config.openai.apiKey,
    baseURL: config.openai.apiUrl,
});

// Function to make OpenAI API calls
export async function callOpenAIAPI(
    messages: any[],
    model: string,
    maxTokens = 300,
): Promise<string> {
    try {
        log.debug("Sending request to OpenAI:", { model, messages, maxTokens });
        const response = await openai.chat.completions.create({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0,
        });

        const content = response.choices[0].message.content;
        log.debug("Received response from OpenAI:", { content });

        if (!content) {
            log.error("OpenAI API returned empty content");
            return "false";
        }
        return content;
    } catch (error: any) {
        log.error("Error calling OpenAI API:", error);
        return "false";
    }
}
