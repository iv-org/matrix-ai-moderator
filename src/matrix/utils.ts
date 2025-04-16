import { log } from "../logger.ts";

const RATE_LIMIT_DELAY = 1000; // 1 second base delay
const MAX_RETRIES = 3;

interface MatrixError extends Error {
    statusCode?: number;
}

export async function withRateLimit<T>(
    operation: () => Promise<T>,
    retryCount = 0,
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        const matrixError = error as MatrixError;
        if (matrixError.statusCode === 429 && retryCount < MAX_RETRIES) {
            // Calculate exponential backoff delay
            const delay = RATE_LIMIT_DELAY * Math.pow(2, retryCount);
            log.warn(
                `Rate limited, retrying in ${delay}ms (attempt ${
                    retryCount + 1
                }/${MAX_RETRIES})`,
            );

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));

            // Retry the operation
            return withRateLimit(operation, retryCount + 1);
        }
        throw error;
    }
}

export async function delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
