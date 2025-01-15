const express = require('express');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// In-memory conversation history store
const conversationHistory = new Map();

// Configure multer for handling file uploads with memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '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'
});

// Root route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to transcribe audio
async function transcribeAudio(audioBuffer) {
  try {
    // Write buffer to temporary file
    const tempPath = path.join(__dirname, `temp-${Date.now()}.wav`);
    fs.writeFileSync(tempPath, audioBuffer);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "whisper-large-v3-turbo",
      language: "en",
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);
    return transcription.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

// Function to get AI response
async function getAIResponse(text, sessionId) {
  try {
    // Get or initialize conversation history
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }
    const history = conversationHistory.get(sessionId);

    // Keep only last 10 messages to maintain context without slowing down
    if (history.length > 20) {
      history.splice(0, 2); // Remove oldest message pair
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
    throw error;
  }
}

// Handle audio upload and processing
app.post('/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No audio file received');
    }

    // Get or generate session ID
    const sessionId = req.headers['session-id'] || Date.now().toString();

    // Process audio buffer directly
    const transcription = await transcribeAudio(req.file.buffer);
    
    // Get AI response with conversation history
    const aiResponse = await getAIResponse(transcription, sessionId);

    res.json({
      transcription,
      aiResponse,
      sessionId
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ error: 'Error processing audio: ' + error.message });
  }
});

// Endpoint to clear conversation history
app.post('/clear-history', (req, res) => {
  const sessionId = req.body.sessionId;
  if (sessionId && conversationHistory.has(sessionId)) {
    conversationHistory.delete(sessionId);
  }
  res.json({ success: true });
});

// Catch-all route to handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 