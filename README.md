# MedBuddy AI - Simple Voice Medication Reminder

A simple voice-first medication reminder app using browser Web Speech API and Groq (free LLM).

## 🎯 Features

- **Voice-First Interface**: Speak naturally using browser's built-in speech recognition
- **AI-Powered Conversations**: Groq AI provides intelligent responses
- **Medication Tracking**: Visual checklist with real-time updates
- **Elderly-Friendly UI**: Large fonts, high contrast, simple interface
- **No Complex Setup**: Works in Chrome/Edge with just API keys

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript
- **Voice**: Browser Web Speech API (no setup needed)
- **AI**: Groq SDK (free LLM API)
- **Storage**: In-memory (mock data)

## 📋 Prerequisites

- Node.js 18+ and npm
- Groq API key (free)
- Chrome or Edge browser (for Web Speech API)

## 🚀 Quick Start

### Step 1: Get Groq API Key (FREE)

1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up for a free account
3. Navigate to "API Keys" section
4. Click "Create API Key"
5. Copy your API key (starts with `gsk_`)

### Step 2: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Step 3: Configure Environment Variables

**Frontend** - Create `.env` in root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend** - Create `.env` in `server/` directory:
```env
PORT=3001
GROQ_API_KEY=gsk_your_api_key_here
```

### Step 4: Run the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

You should see:
```
MedBuddy AI Server running on port 3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

You should see:
```
- ready started server on 0.0.0.0:3000
```

### Step 5: Use the App

1. Open [http://localhost:3000](http://localhost:3000)
2. Click the big green "Talk to MedBuddy" button
3. Allow microphone access when prompted
4. Speak naturally (e.g., "I took my Metformin")
5. MedBuddy will respond with voice and text

## 📁 Project Structure

```
medbuddy-ai/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main voice chat interface
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── data/
│   │   └── medications.ts    # Mock medication data
│   └── types/
│       └── speech.d.ts       # Web Speech API types
├── server/
│   └── src/
│       └── index.ts          # Express server with Groq
├── package.json
└── server/package.json
```

## 🧪 Testing

### Test Backend
```bash
curl http://localhost:3001/health
```

### Test Chat API
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "conversationHistory": [], "medications": []}'
```

## 💬 Example Conversations

- "I took my Metformin" → Marks Metformin as taken
- "What medications do I need to take?" → Lists due medications
- "Tell me about my medications" → Provides medication information
- "I feel dizzy" → Provides helpful response

## 🎨 UI Features

- **Green Button**: Ready to talk
- **Red Button**: Currently listening
- **Medication Checklist**: 
  - Green border = Taken
  - Yellow border = Due now
  - Gray border = Not due yet
- **Conversation History**: Shows all messages with timestamps

## 🔧 Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

### Backend
- `npm run dev` - Start with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Start production server

## 🐛 Troubleshooting

### Microphone not working
- Use Chrome or Edge browser
- Check browser permissions (Settings → Privacy → Microphone)
- Make sure you're on localhost or HTTPS

### "Cannot connect to server"
- Make sure backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `.env`

### "Groq API key not configured"
- Check `GROQ_API_KEY` in `server/.env`
- Restart backend server after changing `.env`

### Speech recognition not working
- Use Chrome or Edge (best support)
- Check browser console for errors
- Make sure microphone permission is granted

## 📝 Mock Data

The app comes with mock data for **Mr. Sharma**:
- **Metformin** (500mg) - 9 AM
- **Amlodipine** (5mg) - 2 PM
- **Aspirin** (75mg) - 9 PM

## 🔒 Security Notes

- Never commit `.env` files
- Keep API keys secure
- For production, use proper secret management

## 📚 Resources

- [Groq API Documentation](https://console.groq.com/docs)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Next.js Documentation](https://nextjs.org/docs)

## 📄 License

MIT

---

**Ready to use!** Just get your Groq API key and start talking to MedBuddy! 🎤
