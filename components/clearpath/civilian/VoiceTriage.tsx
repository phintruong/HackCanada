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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Stable refs to break circular dependencies
  const startListeningRef = useRef<() => void>(() => {});
  const sendMessageRef = useRef<(text: string, msgs: Message[]) => void>(() => {});

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Stop silence detection loop
  const stopSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Start silence detection — auto-sends after 2s of silence once user has spoken
  const startSilenceDetection = useCallback((analyser: AnalyserNode, onSilence: () => void) => {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const SILENCE_THRESHOLD = 15;
    const SILENCE_DURATION = 2000;

    const check = () => {
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength) * 100;

      if (rms > SILENCE_THRESHOLD) {
        hasSpokenRef.current = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (hasSpokenRef.current && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(onSilence, SILENCE_DURATION);
      }

      animFrameRef.current = requestAnimationFrame(check);
    };

    animFrameRef.current = requestAnimationFrame(check);
  }, []);

  // Transcribe recorded audio blob and send to conversation
  const transcribeAndSend = useCallback(async (blob: Blob) => {
    if (blob.size === 0) {
      setIsThinking(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Transcription failed: ${res.status}`);
      }

      const { text } = await res.json();
      setIsThinking(false);

      if (text && text.trim()) {
        setMessages(prev => {
          sendMessageRef.current(text.trim(), prev);
          return prev;
        });
      } else {
        setError("Didn't catch that. Try again or type your response.");
      }
    } catch (err) {
      console.error('[VoiceTriage] ElevenLabs STT failed:', err);
      setIsThinking(false);
      setError('Transcription failed. Please try again or type your response.');
    }
  }, []);

  // Stop recorder, transcribe, then conversation flow auto-restarts listening
  const finishRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    stopSilenceDetection();
    setIsListening(false);
    setIsThinking(true);
    hasSpokenRef.current = false;

    const audioBlob = await new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        resolve(blob);
      };
      mediaRecorder.stop();
    });

    mediaRecorderRef.current = null;
    await transcribeAndSend(audioBlob);
  }, [stopSilenceDetection, transcribeAndSend]);

  // Speak text using ElevenLabs TTS via /api/speak
  const speakText = useCallback(async (text: string, onSpeechEnd?: () => void) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    stopSilenceDetection();

    try {
      setIsSpeaking(true);
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
  }, [stopSilenceDetection]);

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

      // Speak the response, then auto-resume listening
      if (data.reply) {
        if (data.triage) {
          speakText(data.reply, () => {
            setTimeout(() => {
              onTriageComplete(data.triage);
            }, 500);
          });
        } else {
          speakText(data.reply, () => {
            startListeningRef.current();
          });
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

  // Start listening — acquire mic, record, and detect silence
  const startListening = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];
    hasSpokenRef.current = false;

    try {
      let stream = streamRef.current;
      if (!stream || stream.getTracks().every(t => t.readyState === 'ended')) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      mediaRecorder.start();
      setIsListening(true);
      startSilenceDetection(analyser, () => finishRecording());
    } catch {
      setError('Microphone access denied. Please allow mic permissions or type instead.');
      setIsListening(false);
    }
  }, [startSilenceDetection, finishRecording]);

  // Keep refs in sync
  startListeningRef.current = startListening;
  sendMessageRef.current = sendMessage;

  // Manual stop — user taps to send immediately (interrupt)
  const stopListening = useCallback(async () => {
    await finishRecording();
  }, [finishRecording]);

  // Start the conversation
  const startConversation = useCallback(async () => {
    setStarted(true);
    setError(null);

    const greeting: Message = { role: 'assistant', content: "ERoute here. What's going on?" };
    setMessages([greeting]);
    await speakText(greeting.content, () => {
      startListeningRef.current();
    });
  }, [speakText]);

  // Send typed message
  const handleSendText = useCallback(() => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');

    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    setMessages(prev => {
      sendMessageRef.current(text, prev);
      return prev;
    });
  }, [textInput]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopSilenceDetection();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
    };
  }, [stopSilenceDetection]);

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
        {/* Mic button — tap to send early (interrupt), or let silence auto-send */}
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isSpeaking || isThinking}
          className={`w-full py-3 rounded-2xl text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
            isListening
              ? 'bg-green-500 text-white shadow-lg shadow-green-200'
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
              Listening... Tap to Send
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
