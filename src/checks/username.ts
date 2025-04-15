import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";

export async function isUsernameInappropriate(username: string): Promise<boolean> {
  const messages = [
    {
      role: "system",
      content: "You are a content moderator. Check if the following username is inappropriate, offensive, or contains harmful content. You must respond with exactly 'true' if inappropriate, or exactly 'false' if appropriate. Do not include any other text in your response.",
    },
    {
      role: "user",
      content: username,
    },
  ];
  const response = await callOpenAIAPI(messages, config.openai.textModel);
  return response.toLowerCase() === "true";
} 