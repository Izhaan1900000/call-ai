# AI Call Assistant

A real-time voice chat application that lets you have natural conversations with an AI friend. Built with Node.js, Express, and the Groq AI API.

## Features

- Natural voice conversations with AI
- Real-time voice activity detection
- Automatic speech recognition
- Natural text-to-speech responses
- Call-like interface with mute and end call options
- Conversation memory during calls
- Voice visualization
- Microsoft Zira voice integration

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- AI: Groq API (Mixtral-8x7b model)
- Speech: Web Speech API
- Audio: Web Audio API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file and add your Groq API key:
```
GROQ_API_KEY=your_api_key_here
```

3. Start the server:
```bash
node index.js
```

4. Open http://localhost:3001 in your browser

## Deployment

The project is configured for deployment on Vercel. Just connect your GitHub repository to Vercel and it will automatically deploy.

## Credits

Developed with ❤️ by Izhan 