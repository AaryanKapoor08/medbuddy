# MedBuddy AI

MedBuddy AI is a voice-enabled medication reminder prototype. It lets a patient speak or type a message, sends the message to a small Express API, and returns a short response that can be read aloud in the browser.

This project is intended for development and demonstration. It is not a medical device and should not be used as a substitute for professional medical advice, diagnosis, or treatment.

## Features

- Voice input through the browser Web Speech API
- Spoken responses through browser speech synthesis
- Text input as a fallback when speech recognition is unavailable
- Medication checklist with taken and due states
- Express API for chat requests
- Groq-backed response generation
- Mock patient and medication data for local testing

## Architecture

```text
Browser
  |
  | Speech input, text input, checklist actions
  v
Next.js application
  |
  | POST /api/chat
  v
Express server
  |
  | Groq SDK
  v
Groq API

Mock medication data is stored in the frontend during local development.
```

## Technology

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Express
- Groq SDK
- Browser Web Speech API

## Requirements

- Node.js 18 or newer
- npm
- Chrome or Edge for speech recognition support
- Groq API key

## Setup

Install the frontend dependencies from the project root:

```bash
npm install
```

Install the server dependencies:

```bash
cd server
npm install
cd ..
```

Create a `.env` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Create a `.env` file in `server/`:

```env
PORT=3001
GROQ_API_KEY=gsk_your_api_key_here
```

## Running Locally

Start the API server:

```bash
cd server
npm run dev
```

Start the frontend in a second terminal:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

## Basic Use

1. Open the app in Chrome or Edge.
2. Allow microphone access if you want to use voice input.
3. Speak or type a medication-related message.
4. Review the assistant response and the medication checklist.

Example messages:

- `I took my Metformin`
- `What medication is due now?`
- `Tell me about my medication schedule`

## Project Structure

```text
medbuddy-ai/
|-- app/                  Next.js application routes
|-- src/
|   |-- data/             Mock patient and medication data
|   |-- types/            Browser speech type definitions
|   |-- utils/            Shared frontend utilities
|   `-- app/test/         Local test page
|-- server/
|   |-- index.js          Express server used by npm run dev
|   `-- src/              TypeScript server source and utilities
|-- package.json          Frontend scripts and dependencies
`-- README.md
```

## Scripts

Frontend:

```bash
npm run dev
npm run build
npm start
npm run lint
```

Server:

```bash
cd server
npm run dev
npm start
```

## API Checks

Health check:

```bash
curl http://localhost:3001/health
```

Chat request:

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"I took my Metformin\"}"
```

## Troubleshooting

If microphone input does not work, use Chrome or Edge, check browser microphone permissions, and run the app on `localhost` or HTTPS.

If the frontend cannot connect to the server, confirm that the server is running on port `3001` and that `NEXT_PUBLIC_API_URL` is set correctly.

If the server reports a missing Groq API key, confirm that `GROQ_API_KEY` is present in `server/.env`, then restart the server.

## Security Notes

- Do not commit `.env` files.
- Keep API keys outside source control.
- Replace mock data and in-memory state before considering production use.
- Add appropriate review, logging, monitoring, and clinical safeguards for any real healthcare workflow.

## License

MIT
