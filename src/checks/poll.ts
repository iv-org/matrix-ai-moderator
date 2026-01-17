import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";
import { log } from "../logger.ts";

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

export async function isPollInappropriate(pollContent: Record<string, unknown>): Promise<boolean> {
    try {
        let question = "";
        const answers: string[] = [];

        // Try stable format first (m.poll)
        const stableContent = pollContent as StablePollContent;
        if (stableContent["m.poll"]) {
            const poll = stableContent["m.poll"];
            
            // Extract question from stable format
            if (poll.question?.["m.text"]?.[0]?.body) {
                question = poll.question["m.text"][0].body;
            }
            
            // Extract answers from stable format
            if (poll.answers && Array.isArray(poll.answers)) {
                for (const answer of poll.answers) {
                    const answerText = answer["m.text"]?.[0]?.body;
                    if (answerText) {
                        answers.push(answerText);
                    }
                }
            }
        }
        
        // Try unstable format if stable didn't work (org.matrix.msc3381.poll.start)
        if (!question) {
            const unstableContent = pollContent as UnstablePollContent;
            if (unstableContent["org.matrix.msc3381.poll.start"]) {
                const poll = unstableContent["org.matrix.msc3381.poll.start"];
                
                // Extract question from unstable format
                if (poll.question?.["org.matrix.msc1767.text"]) {
                    question = poll.question["org.matrix.msc1767.text"];
                }
                
                // Extract answers from unstable format
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

        // If we couldn't extract any content, skip moderation
        if (!question && answers.length === 0) {
            log.warn("Could not parse poll content structure");
            return false;
        }

        // Combine question and answers for analysis
        const pollText = `Question: ${question}\nAnswers: ${answers.join(", ")}`;

        log.debug("Checking poll content:", pollText);

        // Skip if poll text is too short
        if (pollText.length < config.checks.minMessageLength) {
            log.debug("Skipping short poll");
            return false;
        }

        const messages = [
            {
                role: "system",
                content:
                    "You are a content moderator. Your job is to detect inappropriate, explicit, scam, marketing, or spam content. You must respond with exactly 'true' if the content is inappropriate, or exactly 'false' if it's appropriate. Do not include any other text in your response.",
            },
            {
                role: "user",
                content: pollText,
            },
        ];

        try {
            const response = await callOpenAIAPI(
                messages,
                config.openai.textModel,
                300,
            );
            const normalizedResponse = response.toLowerCase().trim();
            return normalizedResponse === "true";
        } catch (apiError) {
            log.error("Error calling OpenAI API for poll:", apiError);
            return false;
        }
    } catch (error) {
        log.error("Error processing poll:", error);
        return false;
    }
}
