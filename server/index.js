const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, patientContext } = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message is required and must be a non-empty string' 
      });
    }

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error: Groq API key not found. Please check server/.env file.' 
      });
    }

    console.log('Received message:', message);
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are MedBuddy, a friendly AI healthcare companion for elderly patients. Keep responses SHORT (2-3 sentences max) as they will be spoken aloud. Help with medication reminders and answer health questions simply.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.7,
      max_tokens: 150
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response content from Groq API');
    }

    console.log('Sending response:', responseText);
    res.json({ response: responseText });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    
    let errorMessage = 'Failed to get response from AI';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response) {
      errorMessage = `Groq API error: ${error.response.status} - ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = 'Could not reach Groq API. Please check your internet connection.';
    }

    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MedBuddy AI Server is running',
    hasGroqKey: !!process.env.GROQ_API_KEY
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 MedBuddy AI Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🔑 Groq API Key: ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ NOT SET - Please add GROQ_API_KEY to server/.env'}\n`);
});
