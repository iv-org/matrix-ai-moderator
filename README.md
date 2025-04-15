# Matrix Harm Detection Bot

A Deno-based Matrix bot that protects rooms by monitoring new members and their messages for inappropriate content using OpenAI's API.

## Features

- Monitors new room members
- Checks usernames for inappropriate content
- Temporarily stores new members in Deno KV for 60 minutes
- Monitors messages from new members
- Uses OpenAI API to detect inappropriate content
- Automatically bans users and removes inappropriate content

## Prerequisites

- Deno (latest version)
- Matrix account for the bot
- OpenAI API key
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
   - `OPENAI_API_KEY`: Your OpenAI API key

## Running the Bot

```bash
deno task start
```

## How It Works

1. When a new member joins the room:
   - Their username is checked for inappropriate content
   - If inappropriate, they are banned immediately
   - If appropriate, they are added to a temporary watchlist (60 minutes)

2. For messages from new members:
   - The content is checked for inappropriate material
   - If inappropriate, the message is deleted and the user is banned
   - If appropriate, the message remains

## Note

The bot uses OpenAI's GPT-3.5-turbo model for content moderation. Make sure you have sufficient API credits and understand the costs associated with API usage. 