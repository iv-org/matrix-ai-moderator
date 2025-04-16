# Matrix Harm Detection Bot

A Deno-based Matrix bot that protects rooms by monitoring new members and their messages for inappropriate content using OpenAI's API or any other OpenAI compatible API.

## Features

- Monitors new room members
- Checks usernames for inappropriate content
- Temporarily stores new members in Deno KV for monitoring
- Monitors messages from new members
- Uses OpenAI API or any other OpenAI compatible API to detect inappropriate content
- Two-strike warning system for inappropriate content
- Automatic message deletion and user banning
- Required number of valid messages before removing monitoring

## Prerequisites

- Deno (latest version)
- Matrix account for the bot
- OpenAI API key or OpenAI compatible API key (openrouter for example) 
- Access to a Matrix room you want to protect

## Setup

1. Clone this repository
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your credentials:
   - `MATRIX_HOMESERVER_URL`: Your Matrix homeserver URL
   - `MATRIX_USERNAME`: Bot's Matrix username
   - `MATRIX_PASSWORD`: Bot's Matrix password
   - `MATRIX_ROOM_ID`: ID of the room to protect
   - `OPENAI_API_KEY`: Your OpenAI API key or OpenAI compatible API key
   - `OPENAI_API_URL`: The API endpoint URL (default: https://api.openai.com/v1)
   - `OPENAI_TEXT_MODEL`: The model to use for text analysis (default: gpt-3.5-turbo)
   - `OPENAI_VISION_MODEL`: The model to use for image analysis (default: gpt-4-vision-preview)
   - `CHECKS_REQUIRED_VALID_MESSAGES`: Number of valid messages required before removing monitoring (default: 5)
   - `CHECKS_NEW_MEMBER_DURATION_HOURS`: How long to monitor new members (default: 60 hours)

## Running the Bot

```bash
deno task start
```

## How It Works

1. When a new member joins the room:
   - Their username is checked for inappropriate content
   - If inappropriate, they are banned immediately
   - If appropriate, they are added to a monitoring list for the specified duration

2. For messages from monitored members:
   - The content is checked for inappropriate material
   - If inappropriate:
     - The message is deleted
     - First offense: User receives a warning
     - Second offense: User is banned
   - If appropriate:
     - Message count is incremented
     - Once the required number of valid messages is reached, monitoring is removed

3. Warning System:
   - First inappropriate message: Warning message with 24-hour expiration
   - Second inappropriate message: Immediate ban
   - Warnings expire after 24 hours

## Note

The bot in the Invidious room uses Mistral AI hosted in Europe for content moderation. They claim to not store the content sent to their servers, see their privacy policy: https://mistral.ai/terms/#privacy-policy