'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TriageResult {
  severity: 'critical' | 'urgent' | 'non-urgent';
  reasoning: string;
  symptoms: {
    chestPain: boolean;
    shortnessOfBreath: boolean;
    fever: boolean;
    dizziness: boolean;
    freeText?: string;
  } | null;
}

interface VoiceTriageProps {
  onTriageComplete: (triage: TriageResult) => void;
}

export default function VoiceTriage({ onTriageComplete }: VoiceTriageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Speak text using ElevenLabs TTS via /api/speak
  const speakText = useCallback(async (text: string, onSpeechEnd?: () => void) => {
    try {
      setIsSpeaking(true);
      // Stop any browser TTS just in case
      window.speechSynthesis.cancel();

      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.status.toString());
        throw new Error(`ElevenLabs ${res.status}: ${errText}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
        setIsSpeaking(false);
        onSpeechEnd?.();
      };
      source.start();
    } catch (err) {
      // Fallback to browser TTS
      console.error('[VoiceTriage] ElevenLabs TTS failed, using browser fallback:', err);
      setIsSpeaking(true);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.onend = () => {
        setIsSpeaking(false);
        onSpeechEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onSpeechEnd?.();
      };
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Send message to conversation API
  const sendMessage = useCallback(async (userText: string, currentMessages: Message[]) => {
    const newMessages: Message[] = [...currentMessages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsThinking(true);
    setError(null);

    try {
      const res = await fetch('/api/clearpath/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        throw new Error('Conversation request failed');
      }

      const data = await res.json();
      const assistantMsg: Message = { role: 'assistant', content: data.reply };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);
      setIsThinking(false);

      // Speak the response
      if (data.reply) {
        // If this is the final triage message, delay routing until speech finishes
        if (data.triage) {
          speakText(data.reply, () => {
            setTimeout(() => {
              onTriageComplete(data.triage);
            }, 500);
          });
        } else {
          speakText(data.reply);
        }
      }

      return updatedMessages;
    } catch (err) {
      setIsThinking(false);
      setError('Failed to get response. Please try again.');
      console.error(err);
      return newMessages;
    }
  }, [speakText, onTriageComplete]);

  // Start the conversation
  const startConversation = useCallback(async () => {
    setStarted(true);
    setError(null);

    // Send an initial empty message to get the greeting
    const greeting: Message = { role: 'assistant', content: "Hi there! I'm your ERoute intake assistant. I'm here to help figure out the best ER for your situation. Can you tell me what's going on today? What brought you here?" };
    setMessages([greeting]);
    await speakText(greeting.content);
  }, [speakText]);

  // Start listening with the microphone (continuous — user decides when to stop)
  const startListening = useCallback(() => {
    setError(null);

    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in this browser. Please type your response instead.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalTranscript = '';
    let lastFinalIndex = -1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Only process new final results that haven't been added yet
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal && i > lastFinalIndex) {
          finalTranscript += result[0].transcript + ' ';
          lastFinalIndex = i;
        }
      }

      // Collect interim results after the last final result
      let interim = '';
      for (let i = lastFinalIndex + 1; i < event.results.length; i++) {
        if (!event.results[i].isFinal) {
          interim += event.results[i][0].transcript;
        }
      }
      // Store the accumulated transcript so stopListening can access it
      (recognition as any).__transcript = (finalTranscript + interim).trim();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow mic permissions or type instead.');
      } else if (event.error !== 'aborted') {
        setError("Didn't catch that. Try again or type your response.");
      }
    };

    recognition.onend = () => {
      // Only clean up state — actual sending happens in stopListening
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch {
      setError('Failed to start listening.');
      setIsListening(false);
    }
  }, []);

  // Stop listening — gather transcript and send
  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    const text = ((recognition as any).__transcript || '').trim();
    recognition.stop();
    recognitionRef.current = null;
    setIsListening(false);

    if (text) {
      setMessages(prev => {
        sendMessage(text, prev);
        return prev;
      });
    }
  }, [sendMessage]);

  // Send typed message
  const handleSendText = useCallback(() => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');

    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    setMessages(prev => {
      sendMessage(text, prev);
      return prev;
    });
  }, [textInput, sendMessage]);

  // Cleanup
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis.cancel();
    };
  }, []);

  // Initial "We're here to listen" screen
  if (!started) {
    return (
      <div className="flex flex-col items-center text-center space-y-5 py-4">
        <div className="w-20 h-20 rounded-full bg-sky-100 flex items-center justify-center shadow-md">
          <svg className="w-10 h-10 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-800">We&apos;re here to listen</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
            Talk to our AI assistant about what&apos;s going on. We&apos;ll ask a few questions to understand your situation and find the right ER for you.
          </p>
        </div>

        <button
          onClick={startConversation}
          className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-sm font-bold uppercase tracking-wide transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Start Conversation
        </button>

        <p className="text-[10px] text-slate-400">
          You can also type if you prefer
        </p>
      </div>
    );
  }

  // Conversation UI
  return (
    <div className="flex flex-col h-full -mx-1">
      {/* Chat messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 max-h-[45vh]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-sky-500 text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mb-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        {/* Mic button — toggle start/stop, disabled while AI speaks or thinks */}
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isSpeaking || isThinking}
          className={`w-full py-3 rounded-2xl text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
            isListening
              ? 'bg-red-500 text-white shadow-lg shadow-red-200'
              : isSpeaking
                ? 'bg-amber-100 text-amber-700 border border-amber-200 cursor-not-allowed'
                : isThinking
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-sky-500 hover:bg-sky-600 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              Tap to Stop
            </>
          ) : isSpeaking ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586V18.414a1 1 0 01-1.707.707L5.586 15z" />
              </svg>
              AI Speaking...
            </>
          ) : isThinking ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Tap to Speak
            </>
          )}
        </button>

        {/* Text fallback */}
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
            placeholder="Or type here..."
            disabled={isThinking || isSpeaking}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-50"
          />
          <button
            onClick={handleSendText}
            disabled={!textInput.trim() || isThinking || isSpeaking}
            className="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
