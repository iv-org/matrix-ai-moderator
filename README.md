# Matrix Harm Detection Bot

A Deno-based Matrix bot that protects rooms by monitoring new members and their
messages for inappropriate content using OpenAI's API or any other OpenAI
compatible API.

## Features

- **Username & Avatar Checking**: Automatically checks new member usernames and avatars for inappropriate content
- **Content Moderation**: Monitors and analyzes multiple types of content:
  - Text messages
  - Images (including explicit content detection)
  - Stickers
  - Poll questions and answers
  - Room avatar changes
- **Temporary Member Monitoring**: Stores new members in Deno KV for time-limited monitoring
- **AI-Powered Detection**: Uses OpenAI API or any OpenAI-compatible API (like OpenRouter) to detect inappropriate content
- **Two-Strike Warning System**: 
  - First offense: Warning message with 24-hour expiration
  - Second offense: Immediate ban
- **Automatic Actions**:
  - Message deletion and redaction
  - User banning for severe violations
  - Bulk message cleanup for banned users
- **Configurable Thresholds**: Set required number of valid messages and monitoring duration
- **Debug Mode**: Test moderation logic without actually banning users
- **Minimum Message Length**: Skip checking very short messages to reduce API costs

## Prerequisites

- Deno (latest version)
- Matrix account for the bot
3. Edit `.env` with your credentials:
   - `MATRIX_HOMESERVER_URL`: Your Matrix homeserver URL
   - `MATRIX_USERNAME`: Bot's Matrix username
   - `MATRIX_PASSWORD`: Bot's Matrix password
   - `MATRIX_ROOM_ID`: ID of the room to protect
   - `MATRIX_ROOM_LANGUAGE`: The language of the room (used for username checking)
   - `OPENAI_API_KEY`: Your OpenAI API key or OpenAI-compatible API key
   - `OPENAI_API_URL`: The API endpoint URL (default: https://api.openai.com/v1)
   - `OPENAI_TEXT_MODEL`: Model for text analysis (default: gpt-3.5-turbo)
   - `OPENAI_VISION_MODEL`: Model for image analysis (default: gpt-4-vision-preview)
   - `CHECKS_REQUIRED_VALID_MESSAGES`: Number of valid messages required before removing monitoring (default: 5)
   - `CHECKS_NEW_MEMBER_DURATION_HOURS`: How long to monitor new members in hours (default: 60)
   - `CHECKS_MIN_MESSAGE_LENGTH`: Minimum message length to check (default: 10 characters)
   - `DEBUG_MODE`: When `true`, scans all messages but prevents bans (default: false)
   - `LOG_LEVEL`: Logging verbosity - `debug`, `info`, `warn`, or `error` (default: info)t: https://api.openai.com/v1)
   - `OPENAI_TEXT_MODEL`: The model to use for text analysis (default:
     gpt-3.5-turbo)
   - `OPENAI_VISION_MODEL`: The model to use for image analysis (default:
     gpt-4-vision-preview)
   - `CHECKS_REQUIRED_VALID_MESSAGES`: Number of valid messages required before
     removing monitoring (default: 5)
   - `CHECKS_NEW_MEMBER_DURATION_HOURS`: How long to monitor new members
     (default: 60 hours)
   - `CHECKS_MIN_MESSAGE_LENGTH`: Minimum length of messages to check for
     inappropriate content (default: 10 characters)

## Running the Bot

### Using docker compose

```yaml
services:
  matrix-ai-moderator:
    image: ghcr.io/iv-org/matrix-ai-moderator:latest
    restart: unless-stopped
    environment:
    - MATRIX_HOMESERVER_URL=https://XXX
    - MATRIX_USERNAME=XXX
    - MATRIX_PASSWORD=XXX
    - MATRIX_ROOM_ID=XXX
    - OPENAI_API_KEY=XXX
    - LOG_LEVEL=info
```

### Manually using deno

```bash
deno task start
```

## How It Works

1. When a new member joins the room:
## How It Works

### 1. New Member Joining
When a new member joins the room:
- **Username Check**: Username is analyzed for inappropriate content
  - If inappropriate → Immediate ban
- **Avatar Check**: Avatar image is analyzed (if they have one)
  - If inappropriate → Immediate ban
- **Monitoring**: If both checks pass, user is added to monitoring list for the configured duration

### 2. Content Monitoring
For messages from monitored members (or all members in debug mode):

#### Text Messages
- Messages shorter than minimum length are skipped
- Content is analyzed for inappropriate material
- **First offense**: Message deleted + warning sent (24-hour expiration)
- **Second offense**: Message deleted + user banned + message history cleaned

#### Images & Stickers
- Analyzed for explicit or inappropriate content
- If inappropriate → Immediate ban + message deletion + history cleanup

#### Polls
- Question and all answer options are analyzed
- Same two-strike system as text messages

#### Room Avatar Changes
## Monitored Event Types

The bot monitors the following Matrix event types:
- `m.room.member` - User joins (username & avatar checking)
- `m.room.message` - Regular messages (text, images, files, audio, video, etc.)
- `m.sticker` - Sticker messages
- `m.poll.start` / `org.matrix.msc3381.poll.start` - Poll events (both stable and unstable formats)
- `m.room.avatar` - Room avatar changes

## Noteoom avatar is analyzed for inappropriate content
- If inappropriate → User who changed it is banned + history cleanup

### 3. Valid Message Tracking
- Appropriate messages increment the valid message counter
- Once required count is reached → User removed from monitoring
- Only counts when user has no active warnings

### 4. Debug Mode
When `DEBUG_MODE=true`:
- **Scans all messages** from everyone (ignores new member duration)
- **Prevents all bans** (logs what would happen with `[DEBUG]` prefix)
- **Still performs all other actions**: message deletion, warnings, content analysis
- Useful for testing moderation logic safely
The bot in the Invidious room uses Mistral AI hosted in Europe for content
moderation. They claim to not store the content sent to their servers, see their
privacy policy: https://mistral.ai/terms/#privacy-policy
