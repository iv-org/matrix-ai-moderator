FROM denoland/deno:debian-2.6.8 AS builder

ARG TINI_VERSION=0.19.0

WORKDIR /app

COPY ./src/ /app/src/
COPY deno.json /app/

RUN apt update && apt install -y curl

RUN curl -fsSL https://github.com/krallin/tini/releases/download/v${TINI_VERSION}/tini-$(dpkg --print-architecture) \
        --output /tini \
    && chmod +x /tini

RUN deno task compile

# Stage for creating the non-privileged user
FROM alpine:3.23 AS user-stage

RUN adduser -u 10001 -S appuser

FROM gcr.io/distroless/cc

COPY --from=builder /app/ai_matrix_harm_detection /app/
COPY --from=builder /tini /tini

# Copy passwd file for the non-privileged user from the user-stage
COPY --from=user-stage /etc/passwd /etc/passwd

# Set the working directory
WORKDIR /app

# Switch to non-privileged user
USER appuser

ENTRYPOINT ["/tini", "--", "/app/ai_matrix_harm_detection"]
