import React, { useRef, useEffect, useState } from 'react';
import { BotIcon, UserIcon, MicIcon, StopIcon, SendIcon, ClearIcon, SpeakerIcon, LoadingSpinnerIcon } from './Icons';
import { GroundingSource } from '../types';
import { textToSpeech } from '../services/geminiService';

interface Turn {
    id: number;
    user: string;
    ai: string;
    sources?: GroundingSource[];
}

interface ConversationViewProps {
  transcript: Turn[];
  currentUserText: string;
  currentAiText: string;
  conversationState: 'idle' | 'active' | 'error';
  onStart: () => void;
  onStop: () => void;
  isLoadingAiResponse: boolean;
  onSendReport: () => void;
  onSendTextMessage: (text: string) => void;
}

const MAX_CHARS = 1000;

const SourceLink: React.FC<{source: GroundingSource}> = ({ source }) => (
    <a 
        href={source.uri} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block text-xs text-gray-600 hover:text-gray-800 underline truncate transition-colors"
        title={source.title}
    >
        {source.title || (source.uri && new URL(source.uri).hostname)}
    </a>
);


const MessageBody: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  
    return (
      <div className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
          }
          return part;
        })}
      </div>
    );
};

const ConversationView: React.FC<ConversationViewProps> = ({
  transcript,
  currentUserText,
  currentAiText,
  conversationState,
  onStart,
  onStop,
  isLoadingAiResponse,
  onSendReport,
  onSendTextMessage,
}) => {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [inputText, setInputText] = useState('');
  const [ttsState, setTtsState] = useState<{ loadingId: number | null }>({ loadingId: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [transcript, currentUserText, currentAiText, isLoadingAiResponse]);
  
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendTextMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePlayAudio = async (text: string, messageId: number) => {
    if (ttsState.loadingId) return; // Prevent multiple plays
    setTtsState({ loadingId: messageId });
    try {
        await textToSpeech(text);
    } catch (error) {
        console.error("Failed to play audio", error);
    } finally {
        setTtsState({ loadingId: null });
    }
  };

  const getButtonState = () => {
    switch (conversationState) {
        case 'idle':
            return { text: 'Start Conversation', icon: <MicIcon className="w-8 h-8" />, action: onStart, className: 'bg-blue-500 hover:bg-blue-600', ariaLabel: "Start voice conversation" };
        case 'active':
            return { text: 'End Conversation', icon: <StopIcon className="w-8 h-8" />, action: onStop, className: 'bg-red-500 hover:bg-red-600 animate-pulse', ariaLabel: "End voice conversation" };
        case 'error':
             return { text: 'Connection Error. Retry?', icon: <MicIcon className="w-8 h-8" />, action: onStart, className: 'bg-yellow-500 hover:bg-yellow-600', ariaLabel: "Retry voice conversation" };
    }
  }

  const buttonState = getButtonState();
  const hasTranscriptContent = transcript.some(t => t.user || t.ai);

  return (
    <div className="flex flex-col h-full bg-white/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                {transcript.map((turn) => (
                    <React.Fragment key={turn.id}>
                    {turn.user && (
                        <div className="flex items-start gap-3 justify-end animate-slide-in-right">
                            <div className="max-w-md p-4 rounded-2xl shadow-sm bg-blue-500 text-white rounded-br-lg">
                                <MessageBody text={turn.user} />
                            </div>
                            <UserIcon className="w-8 h-8 text-gray-500 flex-shrink-0 mt-1" />
                        </div>
                    )}
                    {turn.ai && (
                        <div className="flex items-start gap-3 animate-slide-in-left">
                            <BotIcon className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
                            <div className="relative group max-w-md p-4 rounded-2xl shadow-sm bg-white text-gray-800 rounded-bl-lg border border-gray-200">
                                <MessageBody text={turn.ai} />
                                {turn.ai && ( // Only show button if there is text
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handlePlayAudio(turn.ai, turn.id)}
                                            disabled={!!ttsState.loadingId}
                                            className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Read aloud"
                                            title="Read aloud"
                                        >
                                            {ttsState.loadingId === turn.id 
                                                ? <LoadingSpinnerIcon className="w-4 h-4" /> 
                                                : <SpeakerIcon className="w-4 h-4" />
                                            }
                                        </button>
                                    </div>
                                )}
                                {turn.sources && turn.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-black/10">
                                        <p className="text-xs font-semibold mb-1 opacity-80">Sources:</p>
                                        <div className="space-y-1">
                                            {turn.sources.map((source, i) => <SourceLink key={i} source={source} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    </React.Fragment>
                ))}
                    {currentUserText && (
                        <div className="flex items-start gap-3 justify-end animate-slide-in-right opacity-70">
                            <div className="max-w-md p-4 rounded-2xl shadow-sm bg-blue-500 text-white rounded-br-lg">
                                <MessageBody text={currentUserText} />
                            </div>
                            <UserIcon className="w-8 h-8 text-gray-500 flex-shrink-0 mt-1" />
                        </div>
                    )}
                    {currentAiText && (
                        <div className="flex items-start gap-3 animate-slide-in-left opacity-70">
                            <BotIcon className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
                            <div className="max-w-md p-4 rounded-2xl shadow-sm bg-white text-gray-800 rounded-bl-lg border border-gray-200">
                                <MessageBody text={currentAiText} />
                            </div>
                        </div>
                    )}
                    {isLoadingAiResponse && (
                        <div className="flex items-start gap-3 animate-slide-in-left">
                            <BotIcon className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
                            <div className="max-w-md p-4 rounded-2xl bg-white text-gray-800 rounded-bl-lg shadow-sm border border-gray-200">
                                <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        </div>
                    )}
                <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="flex-shrink-0 p-4 bg-white/60 backdrop-blur-sm border-t border-gray-200/80">
                <div className="flex justify-center mb-4">
                    <div className="inline-flex rounded-full bg-gray-200 p-1">
                        <button
                            onClick={() => setMode('voice')}
                            disabled={conversationState === 'active'}
                            className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${mode === 'voice' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'} disabled:opacity-50`}
                        >
                            Voice
                        </button>
                        <button
                            onClick={() => setMode('text')}
                            disabled={conversationState === 'active'}
                            className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${mode === 'text' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'} disabled:opacity-50`}
                        >
                            Text
                        </button>
                    </div>
                </div>

                {mode === 'voice' ? (
                    <div className="flex flex-col items-center justify-center">
                        <button
                            onClick={buttonState.action}
                            className={`flex items-center justify-center gap-4 px-8 py-4 rounded-full text-white font-bold text-xl shadow-lg transform transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${buttonState.className}`}
                            aria-label={buttonState.ariaLabel}
                        >
                            {buttonState.icon}
                            <span>{buttonState.text}</span>
                        </button>
                        {conversationState === 'active' && 
                            <p className="text-sm text-gray-600 mt-3">You can speak now. I'm listening...</p>
                        }
                    </div>
                ) : (
                    <div>
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                className="w-full pl-4 pr-28 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none leading-tight max-h-32 overflow-y-auto"
                                rows={1}
                                disabled={isLoadingAiResponse}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                                {inputText.length > 0 && !isLoadingAiResponse && (
                                    <button 
                                        onClick={() => setInputText('')} 
                                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors focus:outline-none"
                                        aria-label="Clear input"
                                    >
                                        <ClearIcon className="w-5 h-5" />
                                    </button>
                                )}
                                <button 
                                    onClick={handleSend}
                                    disabled={!inputText.trim() || isLoadingAiResponse}
                                    className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-blue-300" 
                                    aria-label="Send message"
                                >
                                    <SendIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="text-right text-xs text-gray-500 mt-1 pr-2">
                            {inputText.length} / {MAX_CHARS}
                        </div>
                    </div>
                )}

                {conversationState === 'idle' && hasTranscriptContent && (
                    <button
                        onClick={onSendReport}
                        className="w-full mt-4 text-center text-sm text-indigo-600 hover:text-indigo-800 underline transition-colors"
                    >
                        Email Session Report
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default ConversationView;