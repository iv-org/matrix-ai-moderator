import { callOpenAIAPI } from "../openai/api.ts";
import { config } from "../config.ts";
import { MatrixClient } from "matrix-js-sdk";
import { log } from "../logger.ts";
import {
    buildJsonUserPrompt,
    buildSystemPrompt,
    MODERATION_RESPONSE_FORMAT,
    parseModerationResponse,
} from "../openai/prompt.ts";

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

        const systemPrompt = buildSystemPrompt(
            "Check if the following image is inappropriate, explicit content, scam, marketing, or contains any nudity. Respond with 'true' for inappropriate or 'false' for appropriate.",
        );
        const metadataPrompt = buildJsonUserPrompt(
            "Inspect the referenced image. Use the metadata for context only and set unsafe=true when the picture violates the policy.",
            { source: "m.room.message", type: "image", url: imageUrl },
        );

        try {
            const response = await callOpenAIAPI(
                [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: metadataPrompt },
                            { type: "image_url", image_url: imageUrl },
                        ],
                    },
                ],
                config.openai.visionModel,
                { responseFormat: MODERATION_RESPONSE_FORMAT },
            );
            const result = parseModerationResponse(response);
            if (!result.valid) {
                log.warn("Invalid moderation response for image", { response });
            }
            return result.unsafe;
        } catch (apiError) {
            log.error("Error calling OpenAI API:", apiError);
            return false;
        }
    } catch (error) {
        log.error("Error processing image:", error);
        return false;
    }
}
