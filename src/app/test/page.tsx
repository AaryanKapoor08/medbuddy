'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AgoraConvoAIManager, ConnectionState } from '@/src/utils/agoraConvoAI';
import { mockPatient, getMedicationsDueNow } from '@/src/data/medications';

interface HealthCheck {
  status: 'ok' | 'error';
  message?: string;
  timestamp?: string;
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  details?: any;
}

export default function TestPage() {
  const [agoraStatus, setAgoraStatus] = useState<ConnectionState>('DISCONNECTED');
  const [backendHealth, setBackendHealth] = useState<HealthCheck | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [mockMessage, setMockMessage] = useState('');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const managerRef = useRef<AgoraConvoAIManager | null>(null);

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
      setBackendHealth({
        status: 'ok',
        message: 'Backend is healthy',
        timestamp: new Date().toISOString(),
      });
      console.log('[TEST] Backend health check passed:', response.data);
      return true;
    } catch (error) {
      console.error('[TEST] Backend health check failed:', error);
      setBackendHealth({
        status: 'error',
        message: axios.isAxiosError(error)
          ? `Failed to connect: ${error.message}`
          : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  };

  // Initialize Agora manager for testing
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    if (!appId) {
      console.warn('[TEST] Agora App ID not configured');
      return;
    }

    const manager = new AgoraConvoAIManager({
      appId,
      mode: 'rtc',
      codec: 'vp8',
    });

    manager.setEventCallbacks({
      onConnectionStateChange: (state) => {
        console.log('[TEST] Agora connection state changed:', state);
        setAgoraStatus(state);
      },
      onError: (err) => {
        console.error('[TEST] Agora error:', err);
      },
    });

    managerRef.current = manager;

    return () => {
      manager.destroy().catch(console.error);
    };
  }, []);

  // Run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    // Test 1: Environment variables
    console.log('[TEST] Running environment variable checks...');
    const hasAgoraAppId = !!process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const hasApiUrl = !!process.env.NEXT_PUBLIC_API_URL;
    results.push({
      name: 'Environment Variables',
      status: hasAgoraAppId && hasApiUrl ? 'pass' : 'fail',
      message: hasAgoraAppId && hasApiUrl
        ? 'All required environment variables are set'
        : `Missing: ${!hasAgoraAppId ? 'NEXT_PUBLIC_AGORA_APP_ID' : ''} ${!hasApiUrl ? 'NEXT_PUBLIC_API_URL' : ''}`,
      details: {
        NEXT_PUBLIC_AGORA_APP_ID: hasAgoraAppId ? '✓ Set' : '✗ Missing',
        NEXT_PUBLIC_API_URL: hasApiUrl ? `✓ Set (${process.env.NEXT_PUBLIC_API_URL})` : '✗ Missing',
      },
    });

    // Test 2: Backend health
    console.log('[TEST] Checking backend health...');
    const backendHealthy = await checkBackendHealth();
    results.push({
      name: 'Backend Health',
      status: backendHealthy ? 'pass' : 'fail',
      message: backendHealthy
        ? 'Backend is reachable and healthy'
        : 'Backend is not reachable or unhealthy',
      details: backendHealth,
    });

    // Test 3: Agora token generation
    console.log('[TEST] Testing Agora token generation...');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await axios.post(
        `${apiUrl}/api/agora/token`,
        { channelName: 'test-channel', uid: 123 },
        { timeout: 5000 }
      );
      if (response.data.token) {
        results.push({
          name: 'Agora Token Generation',
          status: 'pass',
          message: 'Token generated successfully',
          details: { tokenLength: response.data.token.length },
        });
        console.log('[TEST] Agora token generated successfully');
      } else {
        results.push({
          name: 'Agora Token Generation',
          status: 'fail',
          message: 'Token not in response',
        });
      }
    } catch (error) {
      console.error('[TEST] Agora token generation failed:', error);
      results.push({
        name: 'Agora Token Generation',
        status: 'fail',
        message: axios.isAxiosError(error)
          ? `Failed: ${error.message}`
          : 'Unknown error',
        details: error,
      });
    }

    // Test 4: Claude API (if backend is up)
    if (backendHealthy) {
      console.log('[TEST] Testing Claude API...');
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await axios.post(
          `${apiUrl}/api/chat`,
          {
            message: 'Hello, this is a test',
            conversationHistory: [],
            medications: [],
          },
          { timeout: 10000 }
        );
        if (response.data.response) {
          results.push({
            name: 'Claude API',
            status: 'pass',
            message: 'Claude API is working',
            details: { responseLength: response.data.response.length },
          });
          console.log('[TEST] Claude API test passed');
        } else {
          results.push({
            name: 'Claude API',
            status: 'fail',
            message: 'No response from Claude',
          });
        }
      } catch (error) {
        console.error('[TEST] Claude API test failed:', error);
        results.push({
          name: 'Claude API',
          status: 'fail',
          message: axios.isAxiosError(error)
            ? `Failed: ${error.response?.data?.error || error.message}`
            : 'Unknown error',
          details: error,
        });
      }
    } else {
      results.push({
        name: 'Claude API',
        status: 'pending',
        message: 'Skipped - backend not available',
      });
    }

    // Test 5: Medication data
    console.log('[TEST] Testing medication data...');
    const dueMeds = getMedicationsDueNow(mockPatient);
    results.push({
      name: 'Medication Data',
      status: 'pass',
      message: `Found ${mockPatient.medications.length} medications, ${dueMeds.length} due now`,
      details: {
        totalMedications: mockPatient.medications.length,
        dueNow: dueMeds.length,
        patientName: mockPatient.name,
      },
    });

    setTestResults(results);
    setIsRunningTests(false);
    console.log('[TEST] All tests completed:', results);
  };

  // Send mock message to chat API
  const sendMockMessage = async () => {
    if (!mockMessage.trim()) return;

    setIsSendingMessage(true);
    setChatResponse(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log('[TEST] Sending mock message:', mockMessage);

      const response = await axios.post(
        `${apiUrl}/api/chat`,
        {
          message: mockMessage,
          conversationHistory: [],
          medications: mockPatient.medications.map((m) => ({
            id: m.id,
            name: m.name,
            taken: m.taken,
          })),
        },
        { timeout: 15000 }
      );

      console.log('[TEST] Chat response received:', response.data);
      setChatResponse(response.data.response);

      if (response.data.emergency) {
        console.log('[TEST] Emergency detected:', response.data.emergency);
      }
      if (response.data.medicationUpdates) {
        console.log('[TEST] Medication updates:', response.data.medicationUpdates);
      }
    } catch (error) {
      console.error('[TEST] Failed to send mock message:', error);
      setChatResponse(
        axios.isAxiosError(error)
          ? `Error: ${error.response?.data?.error || error.message}`
          : 'Unknown error occurred'
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Quick test messages
  const quickTestMessages = [
    'I took my Metformin',
    'I feel dizzy',
    'I have chest pain',
    'What medications do I need to take?',
    'Hello',
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-gray-900 mb-8">MedBuddy AI - Test Dashboard</h1>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Agora Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-2">Agora Status</h2>
            <div className={`text-3xl font-bold ${
              agoraStatus === 'CONNECTED' ? 'text-green-600' :
              agoraStatus === 'CONNECTING' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {agoraStatus}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Connection state: {agoraStatus}
            </p>
          </div>

          {/* Backend Health */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-2">Backend Health</h2>
            {backendHealth ? (
              <>
                <div className={`text-3xl font-bold ${
                  backendHealth.status === 'ok' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {backendHealth.status === 'ok' ? '✓ Healthy' : '✗ Error'}
                </div>
                <p className="text-sm text-gray-600 mt-2">{backendHealth.message}</p>
                {backendHealth.timestamp && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(backendHealth.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500">Not checked yet</p>
            )}
          </div>

          {/* Test Results Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-2">Test Results</h2>
            {testResults.length > 0 ? (
              <>
                <div className="text-3xl font-bold text-blue-600">
                  {testResults.filter(r => r.status === 'pass').length} / {testResults.length}
                </div>
                <p className="text-sm text-gray-600 mt-2">Tests passed</p>
              </>
            ) : (
              <p className="text-gray-500">No tests run yet</p>
            )}
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-3xl font-semibold mb-4">Test Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={checkBackendHealth}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Check Backend Health
            </button>
            <button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
            >
              {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-3xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    result.status === 'pass'
                      ? 'bg-green-50 border-green-500'
                      : result.status === 'fail'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{result.name}</h3>
                      <p className="text-gray-700">{result.message}</p>
                      {result.details && (
                        <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <span className="text-2xl">
                      {result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⏳'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mock Conversation Tester */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-3xl font-semibold mb-4">Mock Conversation Tester</h2>
          
          {/* Quick Test Buttons */}
          <div className="mb-4">
            <p className="text-lg font-semibold mb-2">Quick Test Messages:</p>
            <div className="flex flex-wrap gap-2">
              {quickTestMessages.map((msg, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setMockMessage(msg);
                    setTimeout(() => sendMockMessage(), 100);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message Input */}
          <div className="mb-4">
            <label className="block text-lg font-semibold mb-2">Custom Message:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={mockMessage}
                onChange={(e) => setMockMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMockMessage()}
                placeholder="Type a message to test..."
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={sendMockMessage}
                disabled={isSendingMessage || !mockMessage.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                {isSendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>

          {/* Response Display */}
          {chatResponse && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
              <h3 className="text-lg font-semibold mb-2">AI Response:</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{chatResponse}</p>
            </div>
          )}
        </div>

        {/* Console Log Viewer */}
        <div className="bg-gray-900 rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Console Logs</h2>
          <p className="text-gray-400 text-sm">
            Open browser DevTools (F12) to see detailed console logs with [TEST] prefix
          </p>
        </div>
      </div>
    </main>
  );
}

