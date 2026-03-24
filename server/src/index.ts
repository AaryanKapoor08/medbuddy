import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'MedBuddy AI Server is running' });
});

/**
 * POST /api/chat
 * Handles conversation with Groq AI for medication reminders
 * 
 * Request body:
 * - message: string (required) - User's message/transcription
 * - conversationHistory: array (optional) - Previous conversation messages
 * - medications: array (optional) - Current medication list with status
 * 
 * Returns:
 * - response: string - AI's response text
 * - medicationUpdates: array - Medications that should be marked as taken
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory = [], medications = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'message is required and must be a string' 
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ 
        error: 'Groq API key not configured' 
      });
    }

    // Build system prompt for medication reminder assistant
    const systemPrompt = `You are a helpful medication reminder assistant for elderly patients. 
Your role is to:
1. Remind patients about their medications
2. Confirm when medications are taken
3. Answer questions about medications
4. Be friendly, clear, and use simple language

When a patient confirms they've taken a medication, respond naturally and acknowledge it.
The system will automatically update the medication status based on your response.

Current medications: ${JSON.stringify(medications, null, 2)}

Be concise and warm. Use simple words that elderly patients can easily understand.`;

    // Build conversation messages
    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.1-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Simple pattern matching to detect medication confirmations
    const medicationUpdates: string[] = [];
    const confirmationPhrases = [
      'taken', 'took', 'had', 'done', 'finished', 'completed', 'yes', 'yeah', 'yep'
    ];
    
    const lowerResponse = responseText.toLowerCase();
    medications.forEach((med: { name: string; id: string }) => {
      const medNameLower = med.name.toLowerCase();
      if (lowerResponse.includes(medNameLower)) {
        const hasConfirmation = confirmationPhrases.some(phrase => 
          lowerResponse.includes(phrase)
        );
        if (hasConfirmation) {
          medicationUpdates.push(med.id);
        }
      }
    });

    res.json({
      response: responseText,
      medicationUpdates,
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MedBuddy AI Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Chat endpoint: http://localhost:${PORT}/api/chat`);
});
