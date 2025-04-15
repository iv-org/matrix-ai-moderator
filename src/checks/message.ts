import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";

export async function isMessageInappropriate(content: string): Promise<boolean> {
  const messages = [
    {
      role: "system",
      content: "You are a content moderator. Check if the following message is inappropriate, offensive, scam, phishing, marketing, or contains harmful content. You must respond with exactly 'true' if inappropriate, or exactly 'false' if appropriate. Do not include any other text in your response.",
    },
    {
      role: "user",
      content: content,
    },
  ];
  const response = await callOpenAIAPI(messages, config.openai.textModel);
  return response.toLowerCase() === "true";
} 