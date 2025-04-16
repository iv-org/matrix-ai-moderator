import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";
import { MatrixClient } from "matrix-js-sdk";
import { log } from "../logger.ts";

export async function analyzeImage(
    imageUrl: string,
    matrixClient: MatrixClient,
): Promise<boolean> {
    try {
        // Convert Matrix mxc:// URL to https:// URL
        const mxcUrl = new URL(imageUrl);
        if (mxcUrl.protocol === "mxc:") {
            const serverName = mxcUrl.host;
            const mediaId = mxcUrl.pathname.slice(1); // Remove leading slash

            // Try to use the Matrix client's method first
            let httpUrl = matrixClient.mxcUrlToHttp(`${serverName}/${mediaId}`);

            // If that fails, construct the URL manually with the correct format
            if (!httpUrl) {
                const homeserverUrl = config.matrix.homeserverUrl.replace(
                    /\/$/,
                    "",
                ); // Remove trailing slash if present
                httpUrl =
                    `${homeserverUrl}/_matrix/client/v1/media/download/${serverName}/${mediaId}`;
            }

            // Add access token as query parameter
            imageUrl =
                `${httpUrl}?access_token=${matrixClient.getAccessToken()}`;
        }

        const messages = [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text:
                            "You are a content moderator. Check if the following image is inappropriate, explicit content, scam, marketing, or contains any nudity. You must respond with exactly 'true' if inappropriate, or exactly 'false' if appropriate. Do not include any other text in your response.",
                    },
                    {
                        type: "image_url",
                        image_url: imageUrl,
                    },
                ],
            },
        ];

        try {
            const response = await callOpenAIAPI(
                messages,
                config.openai.visionModel,
                300,
            );
            const normalizedResponse = response.toLowerCase().trim();
            return normalizedResponse === "true";
        } catch (apiError) {
            log.error("Error calling OpenAI API:", apiError);
            return false;
        }
    } catch (error) {
        log.error("Error processing image:", error);
        return false;
    }
}
