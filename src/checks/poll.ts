import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";
import { log } from "../logger.ts";
import {
    buildJsonUserPrompt,
    buildSystemPrompt,
    MODERATION_RESPONSE_FORMAT,
    parseModerationResponse,
} from "../openai/prompt.ts";

// Types for stable m.poll.start format (MSC3381)
interface StablePollContent {
    "m.poll"?: {
        question?: {
            "m.text"?: Array<{ body?: string }>;
        };
        answers?: Array<{
            "m.id"?: string;
            "m.text"?: Array<{ body?: string }>;
        }>;
    };
}

// Types for unstable org.matrix.msc3381.poll.start format
interface UnstablePollContent {
    "org.matrix.msc3381.poll.start"?: {
        question?: {
            "org.matrix.msc1767.text"?: string;
        };
        answers?: Array<{
            id?: string;
            "org.matrix.msc1767.text"?: string;
        }>;
    };
}

export function pollContentToText(
    pollContent: Record<string, unknown>,
): string {
    let question = "";
    const answers: string[] = [];

    const stableContent = pollContent as StablePollContent;
    if (stableContent["m.poll"]) {
        const poll = stableContent["m.poll"];
        if (poll.question?.["m.text"]?.[0]?.body) {
            question = poll.question["m.text"][0].body;
        }
        if (poll.answers && Array.isArray(poll.answers)) {
            for (const answer of poll.answers) {
                const answerText = answer["m.text"]?.[0]?.body;
                if (answerText) {
                    answers.push(answerText);
                }
            }
        }
    }

    if (!question) {
        const unstableContent = pollContent as UnstablePollContent;
        if (unstableContent["org.matrix.msc3381.poll.start"]) {
            const poll = unstableContent["org.matrix.msc3381.poll.start"];
            if (poll.question?.["org.matrix.msc1767.text"]) {
                question = poll.question["org.matrix.msc1767.text"];
            }
            if (poll.answers && Array.isArray(poll.answers)) {
                for (const answer of poll.answers) {
                    const answerText = answer["org.matrix.msc1767.text"];
                    if (answerText) {
                        answers.push(answerText);
                    }
                }
            }
        }
    }

    if (!question && answers.length === 0) {
        return "";
    }

    return `Question: ${question}\nAnswers: ${answers.join(", ")}`;
}

export async function isPollInappropriate(
    pollContent: Record<string, unknown>,
): Promise<boolean> {
    try {
        const pollText = pollContentToText(pollContent);
        if (!pollText) {
            log.warn("Could not parse poll content structure");
            return false;
        }

        log.debug("Checking poll content:", pollText);

        if (pollText.length < config.checks.minMessageLength) {
            log.debug("Skipping short poll");
            return false;
        }

        const systemPrompt = buildSystemPrompt(
            "Check if the following poll content is inappropriate, explicit, hateful, scam, marketing, or spam. Respond with 'true' for inappropriate or 'false' for appropriate.",
        );
        const userPrompt = buildJsonUserPrompt(
            "Review the `poll_text` string and set unsafe=true if it violates the policy.",
            { poll_text: pollText },
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
            log.warn("Invalid moderation response for poll", { response });
        }
        return result.unsafe;
    } catch (error) {
        log.error("Error processing poll:", error);
        return false;
    }
}
