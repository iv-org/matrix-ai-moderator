import OpenAI from "openai";
import { config } from "../config.ts";
import { log } from "../logger.ts";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: config.openai.apiKey,
    baseURL: config.openai.apiUrl,
});

function isOpenRouterUrl(url: string): boolean {
    try {
        return new URL(url).hostname === "openrouter.ai" ||
            new URL(url).hostname.endsWith(".openrouter.ai");
    } catch {
        return false;
    }
}

function getProviderPrefs(model: string): {
    order: string[];
    allowFallbacks: boolean;
} {
    return model === config.openai.visionModel
        ? {
            order: config.openai.visionModelProviderOrder,
            allowFallbacks: config.openai.visionModelAllowFallbacks,
        }
        : {
            order: config.openai.textModelProviderOrder,
            allowFallbacks: config.openai.textModelAllowFallbacks,
        };
}

type ResponseFormat = {
    type: string;
    [key: string]: unknown;
};

interface CallOpenAIOptions {
    responseFormat?: ResponseFormat;
}

// Function to make OpenAI API calls
export async function callOpenAIAPI(
    messages: any[],
    model: string,
    options: CallOpenAIOptions = {},
): Promise<string> {
    try {
        log.debug("Sending request to OpenAI:", { model, messages });
        const requestPayload: Record<string, unknown> = {
            model,
            messages,
            temperature: 0,
        };
        if (options.responseFormat) {
            requestPayload.response_format = options.responseFormat;
        }
        const providerPrefs = getProviderPrefs(model);
        if (
            providerPrefs.order.length > 0 &&
            isOpenRouterUrl(config.openai.apiUrl)
        ) {
            requestPayload.provider = {
                order: providerPrefs.order,
                allow_fallbacks: providerPrefs.allowFallbacks,
            };
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
