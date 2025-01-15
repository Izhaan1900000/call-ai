const express = require('express');
const Groq = require('groq-sdk');
const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// In-memory conversation history store
const conversationHistory = new Map();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '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'
});

// Function to create a readable stream from a buffer
function bufferToReadableStream(buffer) {
  return new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });
}

// Function to transcribe audio
async function transcribeAudio(audioBuffer) {
  try {
    // Create a readable stream from the buffer
    const stream = bufferToReadableStream(audioBuffer);
    
    // Add required properties for Groq API
    stream.name = 'audio.wav';
    stream.path = 'audio.wav';
    stream.mimetype = 'audio/wav';

    const transcription = await groq.audio.transcriptions.create({
      file: stream,
      model: "whisper-large-v3-turbo",
      language: "en"
    });

    return transcription.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

// Function to get AI response
async function getAIResponse(text, sessionId) {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('No speech detected');
    }

    // Get or initialize conversation history
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }
    const history = conversationHistory.get(sessionId);

    // Keep only last 10 messages
    if (history.length > 20) {
      history.splice(0, 2);
    }

    const messages = [
      {
        role: "system",
        content: "You are an intelligent and empathetic friend who's great at natural conversations. You have a witty sense of humor, strong opinions, and deep knowledge about various topics. Keep responses conversational and engaging, showing emotional intelligence and genuine interest. Share personal views, make jokes when appropriate, and maintain continuity in conversations. Never mention being AI - act completely human. Keep responses concise and natural as if we're on a phone call. If you don't know something, be honest about it like a human would. Use casual language, slang, and natural expressions that friends use."
      },
      ...history,
      {
        role: "user",
        content: text
      }
    ];

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "mixtral-8x7b-32768",
      temperature: 0.9,
      max_tokens: 100,
    });

    const response = completion.choices[0].message.content;

    // Add to conversation history
    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: response });

    return response;
  } catch (error) {
    console.error('AI response error:', error);
    throw new Error(`AI response failed: ${error.message}`);
  }
}

// Handle audio upload and processing
app.post('/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      throw new Error('No audio file received');
    }

    const sessionId = req.headers['session-id'] || Date.now().toString();

    // Process audio buffer directly
    console.log('Starting transcription...');
    const transcription = await transcribeAudio(req.file.buffer);
    console.log('Transcription completed:', transcription);

    console.log('Getting AI response...');
    const aiResponse = await getAIResponse(transcription, sessionId);
    console.log('AI response received:', aiResponse);

    res.json({
      transcription,
      aiResponse,
      sessionId
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ 
      error: 'Error processing audio',
      message: error.message,
      details: error.stack
    });
  }
});

// Clear conversation history
app.post('/clear-history', (req, res) => {
  const sessionId = req.body.sessionId;
  if (sessionId && conversationHistory.has(sessionId)) {
    conversationHistory.delete(sessionId);
  }
  res.json({ success: true });
});

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 