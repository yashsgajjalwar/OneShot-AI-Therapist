
import React, { useState, useRef, useEffect } from 'react';
import { Message, GroundingSource } from '../types';
import { MicIcon, StopIcon, SendIcon, BotIcon, UserIcon, ClearIcon, PaperclipIcon, EmojiIcon } from './Icons';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string, file?: File) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isLoading: boolean;
  transcription: string;
}

const MAX_CHARS = 1000;
const EMOJIS = ['😊', '😂', '❤️', '👍', '🤔', '🙏', '🎉', '💡', '😢', '😠'];

const SourceLink: React.FC<{source: GroundingSource}> = ({ source }) => (
    <a 
        href={source.uri} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block text-xs text-blue-400 hover:text-blue-300 underline truncate transition-colors"
        title={source.title}
    >
        {source.title || new URL(source.uri).hostname}
    </a>
);

// Simple component to render basic markdown (bold, italics)
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


const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  isRecording,
  onStartRecording,
  onStopRecording,
  isLoading,
  transcription,
}) => {
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Effect for auto-growing textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputText]);
  
  const handleSend = () => {
    if (inputText.trim() || file) {
      onSendMessage(inputText, file || undefined);
      setInputText('');
      setFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowEmojis(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
            setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 overflow-hidden">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 animate-message-enter ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && <BotIcon className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />}
              <div className={`max-w-md p-4 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-lg' : 'bg-white text-gray-800 rounded-bl-lg border border-gray-200'}`}>
                {msg.image && <img src={msg.image} alt="upload" className="mb-2 rounded-lg max-w-full h-auto max-h-48" />}
                <MessageBody text={msg.text} />
                 {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-black/10">
                        <p className="text-xs font-semibold mb-1 opacity-80">Sources:</p>
                        <div className="space-y-1">
                            {msg.sources.map((source, i) => <SourceLink key={i} source={source} />)}
                        </div>
                    </div>
                )}
              </div>
              {msg.sender === 'user' && <UserIcon className="w-8 h-8 text-gray-500 flex-shrink-0 mt-1" />}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 animate-message-enter">
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
      <div className="p-4 bg-white/60 backdrop-blur-sm border-t border-gray-200/80">
        {filePreview && (
          <div className="px-2 pb-2">
            <div className="relative inline-block align-bottom">
              <img src={filePreview} alt="Preview" className="h-16 w-16 object-cover rounded-md" />
              <button
                onClick={() => { setFile(null); setFilePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute -top-1 -right-1 bg-gray-700/80 text-white rounded-full p-0.5 backdrop-blur-sm"
                aria-label="Remove image"
              >
                <ClearIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={isRecording ? transcription : inputText}
            onChange={(e) => !isRecording && setInputText(e.target.value.slice(0, MAX_CHARS))}
            onKeyPress={handleKeyPress}
            placeholder={isRecording ? 'Listening...' : "Type or hold mic to talk..."}
            // Increased pl to 24 (6rem) to clear icons, adjusted pr to 14 (3.5rem)
            className="w-full pl-24 pr-14 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none leading-tight max-h-48 overflow-y-auto min-h-[50px]"
            rows={1}
            disabled={isRecording}
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            <div className="relative">
                <button 
                    onClick={() => setShowEmojis(s => !s)} 
                    className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none"
                    aria-label="Toggle emoji palette"
                >
                    <EmojiIcon className="w-6 h-6" />
                </button>
                {showEmojis && (
                    <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-xl border grid grid-cols-5 gap-1 w-64 z-10">
                        {EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => setInputText(prev => prev + emoji)} className="text-2xl p-1 rounded-md hover:bg-gray-200 transition-colors">
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <label htmlFor="file-upload" className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none cursor-pointer" aria-label="Attach file">
              <PaperclipIcon className="w-5 h-5 stroke-current" />
            </label>
            <input ref={fileInputRef} id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {!isRecording && (inputText || file) ? (
                <button onClick={handleSend} className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Send message">
                    <SendIcon className="w-5 h-5" />
                </button>
            ) : (
                <button
                    onClick={isRecording ? onStopRecording : onStartRecording}
                    className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 ${
                    isRecording ? 'bg-red-500 text-white animate-pulse ring-red-400' : 'bg-blue-500 text-white hover:bg-blue-600 ring-blue-400'
                    }`}
                    aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                    {isRecording ? <StopIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                </button>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-gray-500 mt-1 pr-2">
            {inputText.length} / {MAX_CHARS}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
