import OpenAI from "openai";
import { config } from "../config.ts";
import { log } from "../logger.ts";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: config.openai.apiKey,
    baseURL: config.openai.apiUrl,
});

type ResponseFormat = {
    type: string;
    [key: string]: unknown;
};

interface CallOpenAIOptions {
    maxTokens?: number;
    responseFormat?: ResponseFormat;
}

// Function to make OpenAI API calls
export async function callOpenAIAPI(
    messages: any[],
    model: string,
    maxTokensOrOptions: number | CallOpenAIOptions = 300,
): Promise<string> {
    const options = typeof maxTokensOrOptions === "number"
        ? { maxTokens: maxTokensOrOptions }
        : maxTokensOrOptions;
    const maxTokens = options.maxTokens ?? 300;
    try {
        log.debug("Sending request to OpenAI:", { model, messages, maxTokens });
        const requestPayload: Record<string, unknown> = {
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0,
        };
        if (options.responseFormat) {
            requestPayload.response_format = options.responseFormat;
        }

        const response = await openai.chat.completions.create(
            requestPayload as any,
        );

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
