import OpenAI from "npm:openai";
import { config } from "../config.ts";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.apiUrl,
});

// Function to make OpenAI API calls
export async function callOpenAIAPI(messages: any[], model: string, maxTokens = 300): Promise<string> {
  try {
    console.log(messages)
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0,
    });

    return response.choices[0].message.content;
  } catch (error: any) {
    console.error('Error calling OpenAI API:', error);
    return "false";
  }
}
