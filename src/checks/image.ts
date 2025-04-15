import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";
import { MatrixClient } from "npm:matrix-js-sdk";

export async function analyzeImage(imageUrl: string, matrixClient: MatrixClient): Promise<boolean> {
  try {
    // Convert Matrix mxc:// URL to https:// URL
    const mxcUrl = new URL(imageUrl);
    if (mxcUrl.protocol === 'mxc:') {
      const serverName = mxcUrl.host;
      const mediaId = mxcUrl.pathname.slice(1); // Remove leading slash
      
      // Try to use the Matrix client's method first
      let httpUrl = matrixClient.mxcUrlToHttp(`${serverName}/${mediaId}`);
      
      // If that fails, construct the URL manually with the correct format
      if (!httpUrl) {
        console.log('Client URL conversion failed, using manual URL construction');
        httpUrl = `https://matrix-client.matrix.org/_matrix/client/v1/media/download/${serverName}/${mediaId}`;
      }
      
      // Add access token as query parameter
      imageUrl = `${httpUrl}?access_token=${matrixClient.getAccessToken()}`;
    }

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: "Does this image contain any nudity or explicit content? You must respond with exactly 'true' if it contains nudity, or exactly 'false' if it does not. Do not include any other text in your response." },
          {
            type: "image_url",
            image_url: imageUrl,
          },
        ],
      },
    ];

    try {
      const response = await callOpenAIAPI(messages, config.openai.visionModel, 300);
      const normalizedResponse = response.toLowerCase().trim();
      return normalizedResponse === "true";
    } catch (apiError) {
      console.error('Error calling OpenAI API:', apiError);
      return false;
    }
  } catch (error) {
    console.error('Error processing image:', error);
    return false;
  }
} 