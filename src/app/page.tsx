'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { mockPatient, Patient, Medication, markMedicationTaken, getMedicationsDueNow } from '@/src/data/medications';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function MedBuddyPage() {
  const [patient] = useState<Patient>(mockPatient);
  const [medications, setMedications] = useState<Medication[]>(mockPatient.medications);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await axios.get(`${apiUrl}/health`, { timeout: 3000 });
        console.log('[BACKEND] Connection OK:', response.data);
        if (!response.data.hasGroqKey) {
          setError('⚠️ Backend is running but Groq API key is not configured. Please add GROQ_API_KEY to server/.env');
        }
      } catch (err) {
        console.error('[BACKEND] Connection failed:', err);
        setError('⚠️ Cannot connect to backend server. Make sure it\'s running: cd server && npm run dev');
      }
    };
    checkBackend();
  }, []);

  /**
   * Handle user message
   */
  const handleUserMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) {
      console.log('[CHAT] Skipping empty or duplicate message');
      return;
    }

    console.log('[CHAT] Processing message:', text);
    setIsProcessing(true);
    setIsListening(false);
    setError(null);

    // Add user message to conversation
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      console.log('[API] Sending to:', apiUrl);

      const response = await axios.post(
        `${apiUrl}/api/chat`,
        {
          message: text,
          patientContext: { name: patient.name, medications: medications },
        },
        { timeout: 30000 }
      );

      console.log('[API] Response:', response.data);

      const aiResponse = response.data.response;

      if (!aiResponse) {
        throw new Error('No response from server');
      }

      // Add AI response to conversation
      const aiMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Speak AI response
      await speakText(aiResponse);

    } catch (err) {
      console.error('[ERROR] Chat error:', err);
      let errorMessage = 'Sorry, I encountered an error. Please try again.';

      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
          errorMessage = '❌ Cannot connect to the server. Make sure the backend is running: cd server && npm run dev';
        } else if (err.response) {
          const serverError = err.response.data?.error || 'Unknown server error';
          errorMessage = `❌ ${serverError}`;
          if (err.response.status === 500 && serverError.includes('Groq API key')) {
            errorMessage += '\n\n💡 Make sure you have GROQ_API_KEY in server/.env file';
          }
        } else if (err.request) {
          errorMessage = '❌ No response from server. Check if backend is running on port 3001.';
        } else {
          errorMessage = `❌ Error: ${err.message}`;
        }
      }

      setError(errorMessage);
      
      const errorMsg: Message = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  }, [patient.name, medications, isProcessing]);

  /**
   * Speak text using browser TTS
   */
  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthRef.current) {
        resolve();
        return;
      }

      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = (err) => {
        console.error('[TTS] Error:', err);
        setIsSpeaking(false);
        resolve();
      };

      synthRef.current.cancel();
      synthRef.current.speak(utterance);
    });
  }, []);

  /**
   * Start listening for voice input
   */
  const startListening = useCallback(() => {
    console.log('[SPEECH] Start listening called');
    
    if (!recognitionRef.current) {
      const errorMsg = 'Speech recognition not available. Please use Chrome or Edge browser.';
      console.error('[SPEECH]', errorMsg);
      setError(errorMsg);
      return;
    }

    if (isListening) {
      console.log('[SPEECH] Already listening');
      return;
    }

    if (isProcessing || isSpeaking) {
      console.log('[SPEECH] Busy processing or speaking');
      return;
    }

    try {
      setError(null);
      console.log('[SPEECH] Starting recognition...');
      recognitionRef.current.start();
      setIsListening(true);
      console.log('[SPEECH] Recognition started successfully');
    } catch (error: any) {
      console.error('[SPEECH] Failed to start:', error);
      setIsListening(false);
      
      if (error.name === 'InvalidStateError') {
        setError('Speech recognition is already running. Please wait.');
      } else {
        setError(`Failed to start listening: ${error.message || 'Unknown error'}`);
      }
    }
  }, [isListening, isProcessing, isSpeaking]);

  /**
   * Handle medication click - mark as taken
   */
  const handleMedicationClick = useCallback((medId: string) => {
    const med = medications.find(m => m.id === medId);
    if (!med || med.taken) return;

    const success = markMedicationTaken(patient, medId);
    if (success) {
      setMedications([...patient.medications]);
      const message = `I took my ${med.name}`;
      handleUserMessage(message);
    }
  }, [medications, patient, handleUserMessage]);

  /**
   * Handle text input submit
   */
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && !isProcessing) {
      handleUserMessage(textInput.trim());
      setTextInput('');
    }
  }, [textInput, isProcessing, handleUserMessage]);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Your browser does not support speech recognition. Please use Chrome or Edge.');
      return;
    }

    console.log('[INIT] Setting up speech recognition');

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('[SPEECH] Recognition started');
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log('[SPEECH] Recognized:', transcript);
      setIsListening(false);
      handleUserMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('[SPEECH] Recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again and speak clearly.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'aborted') {
        // User stopped it, that's fine
        console.log('[SPEECH] Recognition aborted');
        setError(null); // Clear error on abort
      } else if (event.error === 'network') {
        setError('Network error: Speech recognition requires internet connection. Please use the text input below instead.');
      } else if (event.error === 'service-not-allowed') {
        setError('Speech recognition service not available. Please use the text input below.');
      } else {
        setError(`Speech recognition error: ${event.error}. Please use the text input below.`);
      }
    };

    recognition.onend = () => {
      console.log('[SPEECH] Recognition ended');
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Initialize Speech Synthesis
    synthRef.current = window.speechSynthesis;

    // Add welcome message
    const welcomeMsg: Message = {
      role: 'assistant',
      content: `Hello ${patient.name}! I'm MedBuddy, your medication reminder assistant. How can I help you today?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [patient.name, handleUserMessage]);

  const dueMeds = getMedicationsDueNow(patient);

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-2rem)]">
        {/* Left Column: Medication Checklist */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full overflow-y-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Today's Medications</h2>
            <div className="space-y-3">
              {medications.map((med) => (
                <div
                  key={med.id}
                  onClick={() => handleMedicationClick(med.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    med.taken
                      ? 'bg-green-50 border-green-500'
                      : dueMeds.some(m => m.id === med.id)
                      ? 'bg-yellow-50 border-yellow-500 hover:border-yellow-600'
                      : 'bg-gray-50 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-3xl ${med.taken ? 'text-green-600' : 'text-gray-400'}`}>
                      {med.taken ? '✓' : '○'}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{med.name}</h3>
                      <p className="text-lg text-gray-700">{med.dosage}</p>
                      <p className="text-lg font-semibold text-blue-600">{med.time}</p>
                      {med.taken && med.takenAt && (
                        <p className="text-sm text-green-600 mt-1">
                          Taken at {new Date(med.takenAt).toLocaleTimeString()}
                        </p>
                      )}
                      {!med.taken && (
                        <p className="text-xs text-gray-500 mt-1">Click to mark as taken</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Conversation */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white rounded-lg shadow-lg flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b-2 border-gray-200">
              <h1 className="text-4xl font-bold text-gray-900">MedBuddy AI</h1>
              <p className="text-lg text-gray-600 mt-2">Your voice medication assistant</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-lg whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div className="p-6 border-t-2 border-gray-200">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-500 rounded-lg">
                  <p className="text-lg font-semibold text-red-800 whitespace-pre-line">⚠️ {error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-sm text-red-600 hover:text-red-800 mt-2 underline"
                  >
                    Dismiss
                  </button>
                  {(error.includes('network') || error.includes('service')) && (
                    <p className="text-sm text-red-700 mt-2">
                      💡 Tip: You can still use the text input above to chat with MedBuddy!
                    </p>
                  )}
                </div>
              )}

              {isProcessing && (
                <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-500 rounded-lg">
                  <p className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </p>
                </div>
              )}

              {/* Text Input Fallback */}
              <form onSubmit={handleTextSubmit} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your message here (works without microphone)..."
                    className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    disabled={isProcessing || isListening || isSpeaking}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTextSubmit(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim() || isProcessing || isListening || isSpeaking}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                  >
                    Send
                  </button>
                </div>
              </form>

              <button
                onClick={startListening}
                disabled={isListening || isProcessing || isSpeaking}
                className={`w-full py-6 px-8 text-white text-3xl font-bold rounded-lg shadow-lg transition-colors ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {isListening ? (
                  <>🎤 Listening... (Speak now)</>
                ) : isSpeaking ? (
                  <>🔊 Speaking...</>
                ) : (
                  <>🎤 Talk to MedBuddy</>
                )}
              </button>

              <p className="text-center text-gray-600 mt-4 text-lg">
                {isListening
                  ? '🎤 Speak now...'
                  : isProcessing
                  ? '⏳ Processing your message...'
                  : isSpeaking
                  ? '🔊 MedBuddy is speaking...'
                  : '💬 Type your message above, or click the button to use voice (requires internet)'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
