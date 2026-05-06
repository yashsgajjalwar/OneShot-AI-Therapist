
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConversationView from './components/ConversationView';
import EmotionDashboard from './components/EmotionDashboard';
import OnboardingFlow from './components/OnboardingFlow';
import ChatWindow from './components/ChatWindow';
import { ChatIcon, CloseIcon } from './components/Icons';
import { GoogleUser, MoodEntry, MoodScale, UserProfile, GroundingSource, Message, HealthLog, CBTEntry } from './types';
import { sendMessageToAI, sendGeneralChatMessage, LiveConversationService } from './services/geminiService';

// TODO: Replace with your actual Google Client ID from the Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "416498675853-cbheupn3uesov6f7iguc7us0fbhkiu4h.apps.googleusercontent.com";

interface Turn {
    id: number;
    user: string;
    ai: string;
    sources?: GroundingSource[];
}

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      mimeType: file.type,
      data: await base64EncodedDataPromise,
    };
};

const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

const LoginScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center space-y-8 border border-white/50">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
             <span className="text-4xl">🧘</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">OneShot</h1>
          <p className="text-lg text-gray-600 font-medium">Your Personal Cognitive AI Therapist</p>
        </div>
        
        <div className="space-y-4 w-full">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
                <p>Sign in to track your mood history and save your personalized wellness profile.</p>
            </div>
            
            {/* Google Button Placeholder */}
            <div id="google-btn" className="flex justify-center h-[40px]"></div>
        </div>

        <p className="text-xs text-gray-400 mt-8">
            Privacy First: Your data is stored locally in your browser.
        </p>
      </div>
    </div>
  );
};

const Header: React.FC<{ user: GoogleUser; onSignOut: () => void }> = ({ user, onSignOut }) => (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
            <img src={user.picture} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-white" />
            <div>
                <p className="font-bold text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-600">Member</p>
            </div>
        </div>
        <button
            onClick={onSignOut}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white/70 backdrop-blur-sm rounded-full hover:bg-white/90 border border-gray-200 transition-colors shadow-sm"
        >
            Sign Out
        </button>
    </div>
);

const App: React.FC = () => {
    const [authUser, setAuthUser] = useState<GoogleUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [conversationState, setConversationState] = useState<'idle' | 'active' | 'error'>('idle');
    const [transcript, setTranscript] = useState<Turn[]>([]);
    const [currentUserText, setCurrentUserText] = useState('');
    const [currentAiText, setCurrentAiText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentIntervention, setCurrentIntervention] = useState('');
    
    // Updated State: Maps date string to array of entries
    const [moodLogs, setMoodLogs] = useState<Record<string, MoodEntry[]>>({});
    // New State: Health Logs
    const [healthLogs, setHealthLogs] = useState<Record<string, HealthLog>>({});
    // New State: CBT Logs
    const [cbtEntries, setCbtEntries] = useState<CBTEntry[]>([]);
    
    // Chatbot state
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [chatbotMessages, setChatbotMessages] = useState<Message[]>([
        { id: 'initial-chatbot', text: "Hello! As your AI assistant, I can help with general questions, analyze images, and more. How can I help you today?", sender: 'ai' }
    ]);
    const [isChatbotLoading, setIsChatbotLoading] = useState(false);

    const liveServiceRef = useRef<LiveConversationService | null>(null);
    const turnCounterRef = useRef(0);

    // --- Authentication ---
    useEffect(() => {
        if (authUser) return;

        const handleCredentialResponse = (response: any) => {
            const data = parseJwt(response.credential);
            if (data) {
                const user: GoogleUser = {
                    id: data.sub,
                    name: data.name,
                    email: data.email,
                    picture: data.picture
                };
                setAuthUser(user);
            }
        };

        if ((window as any).google?.accounts) {
             (window as any).google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse
            });
            (window as any).google.accounts.id.renderButton(
                document.getElementById("google-btn"),
                { theme: "outline", size: "large", width: 250 }
            );
        }
    }, [authUser]);

    const handleSignOut = () => {
        setAuthUser(null);
        setUserProfile(null);
        setTranscript([]);
        setMoodLogs({});
        setHealthLogs({});
        setCbtEntries([]);
        setCurrentIntervention('');
    };

    // --- Data Persistence ---
    useEffect(() => {
        if (!authUser) return;
        try {
            const savedProfile = localStorage.getItem(`userProfile_${authUser.id}`);
            if (savedProfile) {
                setUserProfile(JSON.parse(savedProfile));
            }
            const savedLogs = localStorage.getItem(`moodLogs_${authUser.id}`);
            if (savedLogs) {
                const parsedLogs = JSON.parse(savedLogs);
                // Migration logic from legacy single-entry to array
                const migratedLogs: Record<string, MoodEntry[]> = {};
                Object.keys(parsedLogs).forEach(date => {
                    if (Array.isArray(parsedLogs[date])) {
                        migratedLogs[date] = parsedLogs[date];
                    } else {
                        const legacyLog = parsedLogs[date];
                         migratedLogs[date] = [{
                             id: `${date}-legacy`,
                             timestamp: new Date(date).getTime(),
                             rating: legacyLog.rating,
                             note: legacyLog.note
                         }];
                    }
                });
                setMoodLogs(migratedLogs);
            }

            const savedHealth = localStorage.getItem(`healthLogs_${authUser.id}`);
            if (savedHealth) {
                setHealthLogs(JSON.parse(savedHealth));
            }
            
            const savedCBT = localStorage.getItem(`cbtEntries_${authUser.id}`);
            if (savedCBT) {
                setCbtEntries(JSON.parse(savedCBT));
            }

        } catch (error) {
            console.error("Could not load data from local storage:", error);
        }
    }, [authUser]);
    
    const handleSaveProfile = useCallback((profile: UserProfile) => {
        if (!authUser) return;
        try {
            localStorage.setItem(`userProfile_${authUser.id}`, JSON.stringify(profile));
            setUserProfile(profile);
        } catch (error) {
            console.error("Could not save user profile:", error);
        }
    }, [authUser]);

    const handleLogMood = useCallback((rating: number, note: string) => {
        if (!authUser) return;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const newEntry: MoodEntry = {
            id: Date.now().toString(),
            timestamp: now.getTime(),
            rating,
            note
        };

        setMoodLogs(prevLogs => {
            const currentDayEntries = prevLogs[dateStr] || [];
            const newLogs = { 
                ...prevLogs, 
                [dateStr]: [...currentDayEntries, newEntry] 
            };
            
            try {
                localStorage.setItem(`moodLogs_${authUser.id}`, JSON.stringify(newLogs));
            } catch (error) {
                console.error("Could not save mood logs to local storage:", error);
            }
            return newLogs;
        });
    }, [authUser]);

    const handleLogHealth = useCallback((sleepHours: number, activity: HealthLog['activity']) => {
        if (!authUser) return;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        
        const newLog: HealthLog = {
            date: dateStr,
            sleepHours,
            activity
        };

        setHealthLogs(prev => {
            const newLogs = { ...prev, [dateStr]: newLog };
            try {
                localStorage.setItem(`healthLogs_${authUser.id}`, JSON.stringify(newLogs));
            } catch (error) {
                console.error("Could not save health logs:", error);
            }
            return newLogs;
        });
    }, [authUser]);

    const handleSaveCBTEntry = useCallback((entry: CBTEntry) => {
        if (!authUser) return;
        setCbtEntries(prev => {
            const newEntries = [...prev, entry];
            try {
                localStorage.setItem(`cbtEntries_${authUser.id}`, JSON.stringify(newEntries));
            } catch (error) {
                console.error("Could not save CBT entries:", error);
            }
            return newEntries;
        });
    }, [authUser]);

    // --- Core App Logic ---
    const handleSendTextMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        turnCounterRef.current += 1;
        const newUserTurn: Turn = { id: turnCounterRef.current, user: text, ai: '' };
        setTranscript(prev => [...prev, newUserTurn]);
        setIsLoading(true);

        try {
            const response = await sendMessageToAI(text, userProfile);
            const aiText = response.text;
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const sources: GroundingSource[] = groundingChunks
                ?.map((chunk: any) => ({
                    uri: chunk.web?.uri || '',
                    title: chunk.web?.title || '',
                }))
                .filter((source: GroundingSource) => source.uri) ?? [];

            setTranscript(prev => prev.map(t => t.id === newUserTurn.id ? { ...t, ai: aiText, sources } : t));
            setCurrentIntervention(aiText.split('\n')[0]);

        } catch (error) {
            console.error("Failed to get response from AI:", error);
            const errorMessage = "Sorry, I'm having trouble connecting. Please try again later.";
            setTranscript(prev => prev.map(t => t.id === newUserTurn.id ? { ...t, ai: errorMessage } : t));
        } finally {
            setIsLoading(false);
        }
    }, [userProfile]);

    const handleAskAboutMoodPatterns = useCallback(() => {
        const sortedDates = Object.keys(moodLogs).sort();
        if (sortedDates.length === 0) {
            handleSendTextMessage("I don't have enough mood data to analyze yet. Please log your mood.");
            return;
        }

        const recentDates = sortedDates.slice(-7);
        const logDescription = recentDates.map(date => {
            const entries = moodLogs[date];
            const health = healthLogs[date];
            
            const entriesDesc = entries.map(e => {
                const time = new Date(e.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                return `[${time}] ${e.rating}/5 (${MoodScale[e.rating].label})${e.note ? ` - Note: ${e.note}` : ''}`;
            }).join('; ');

            let healthDesc = '';
            if (health) {
                healthDesc = ` | Sleep: ${health.sleepHours}h, Activity: ${health.activity}`;
            }

            return `Date: ${date}${healthDesc} -> Entries: ${entriesDesc}`;
        }).join('\n');

        const prompt = `Here is my recent mood history (including health metrics if available):\n${logDescription}\n\nBased on this, can you help me identify any potential patterns, correlations between sleep/activity and my mood, or insights about my mood swings?`;
        handleSendTextMessage(prompt);
    }, [moodLogs, healthLogs, handleSendTextMessage]);
    
    const handleStartConversation = useCallback(() => {
        if (!userProfile) return;
        liveServiceRef.current = new LiveConversationService(userProfile,
            (userText) => setCurrentUserText(userText),
            (aiText) => setCurrentAiText(aiText),
            (finalUserText, finalAiText) => {
                turnCounterRef.current += 1;
                setTranscript(prev => [...prev, { id: turnCounterRef.current, user: finalUserText, ai: finalAiText }]);
                setCurrentUserText('');
                setCurrentAiText('');
                if (finalAiText) setCurrentIntervention(finalAiText.split('\n')[0]);
            },
            (error) => {
                console.error('Conversation error:', error);
                setConversationState('error');
            }
        );
        liveServiceRef.current.start();
        setConversationState('active');
    }, [userProfile]);

    const handleStopConversation = useCallback(() => {
        liveServiceRef.current?.stop();
        liveServiceRef.current = null;
        setConversationState('idle');
        setCurrentUserText('');
        setCurrentAiText('');
    }, []);

    const handleSendEmailReport = useCallback(() => {
        if (!authUser || !userProfile || transcript.length === 0) return;
    
        const sessionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const subject = `Your OneShot Session Report - ${sessionDate}`;
        
        let body = `Hello ${userProfile.name},\n\n`;
        body += `Here is a summary and transcript of your session on ${sessionDate}.\n\n`;
        
        body += "****************************************\n";
        body += "  CLIENT PROFILE\n";
        body += "****************************************\n";
        body += `Name: ${userProfile.name}\n`;
        body += `Primary Reasons for Seeking Support: ${userProfile.reasons.join(', ')}\n`;
        body += `Stated Goals: "${userProfile.goals}"\n\n`;

        body += "****************************************\n";
        body += "  SESSION TRANSCRIPT\n";
        body += "****************************************\n\n";

        transcript.forEach((turn, index) => {
            body += `--- Turn ${index + 1} ---\n`;
            if (turn.user) body += `You: ${turn.user}\n`;
            if (turn.ai) body += `OneShot: ${turn.ai}\n`;
            if (turn.sources && turn.sources.length > 0) {
                body += `Sources:\n`;
                turn.sources.forEach(source => {
                    body += `- ${source.title} (${source.uri})\n`;
                });
            }
            body += '\n';
        });
        
        body += "========================================\n\n";
        body += "We hope this is helpful for your reflection. Keep up the great work on your wellness journey!\n\n";
        body += "Sincerely,\nThe OneShot Team\n\n";
        body += "Disclaimer: This is an automated report. The content of this email is confidential and intended for the recipient specified in the message only.";

        const mailtoLink = `mailto:${authUser.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    }, [authUser, userProfile, transcript]);

    const handleSendChatbotMessage = useCallback(async (text: string, file?: File) => {
        if (!text.trim() && !file) return;

        let imagePreviewUrl: string | undefined = undefined;
        if (file) {
            imagePreviewUrl = URL.createObjectURL(file);
        }
    
        const newUserMessage: Message = { 
            id: Date.now().toString(), 
            text, 
            sender: 'user',
            image: imagePreviewUrl 
        };
        setChatbotMessages(prev => [...prev, newUserMessage]);
        setIsChatbotLoading(true);

        try {
            const imagePart = file ? await fileToGenerativePart(file) : undefined;
            const response = await sendGeneralChatMessage(text, imagePart);
            const aiText = response.text;
            const aiMessage: Message = { id: Date.now().toString() + '-ai', text: aiText, sender: 'ai' };
            setChatbotMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Failed to get response from chatbot AI:", error);
            const errorMessage: Message = { id: Date.now().toString() + '-error', text: "Sorry, I'm having trouble connecting right now.", sender: 'ai' };
            setChatbotMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsChatbotLoading(false);
            if (imagePreviewUrl) {
                setTimeout(() => URL.revokeObjectURL(imagePreviewUrl!), 100);
            }
        }
    }, []);

    useEffect(() => () => { liveServiceRef.current?.stop() }, []);

    // --- Render Logic ---
    if (!authUser) {
        return <LoginScreen />;
    }
    if (!userProfile) {
        return <OnboardingFlow onComplete={handleSaveProfile} googleUser={authUser} />;
    }
        
    const initialMessage: Turn[] = transcript.length === 0 && !currentUserText && !currentAiText && conversationState === 'idle'
        ? [{ id: 0, user: '', ai: `Hello ${userProfile.name}! I'm OneShot. You can start a voice session or switch to text chat below.` }]
        : [];
    const displayedTranscript = [...initialMessage, ...transcript];

    return (
        <div className="relative min-h-screen w-full bg-gradient-to-br from-sky-100 via-purple-100 to-white p-4 pt-20 lg:p-8 lg:pt-24">
            <Header user={authUser} onSignOut={handleSignOut} />
            <main className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-7 gap-6 h-[calc(100vh-6.5rem)] lg:h-[calc(100vh-8rem)]">
                <div className="lg:col-span-1 xl:col-span-4 h-full min-h-[500px] lg:min-h-0">
                    <ConversationView 
                        transcript={displayedTranscript}
                        currentUserText={currentUserText}
                        currentAiText={currentAiText}
                        conversationState={conversationState}
                        onStart={handleStartConversation}
                        onStop={handleStopConversation}
                        isLoadingAiResponse={isLoading}
                        onSendReport={handleSendEmailReport}
                        onSendTextMessage={handleSendTextMessage}
                    />
                </div>
                <div className="lg:col-span-1 xl:col-span-3 h-full min-h-[400px] lg:min-h-0">
                    <EmotionDashboard 
                        currentIntervention={currentIntervention}
                        moodLogs={moodLogs}
                        healthLogs={healthLogs}
                        cbtEntries={cbtEntries}
                        userProfile={userProfile}
                        onLogMood={handleLogMood}
                        onLogHealth={handleLogHealth}
                        onSaveCBTEntry={handleSaveCBTEntry}
                        onAskAboutMoodPatterns={handleAskAboutMoodPatterns}
                        onUpdateProfile={handleSaveProfile}
                    />
                </div>
            </main>

            {/* Chatbot Feature */}
            <button
                onClick={() => setIsChatbotOpen(!isChatbotOpen)}
                className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-300 z-50"
                aria-label="Toggle chatbot"
            >
                {isChatbotOpen ? <CloseIcon className="w-6 h-6" /> : <ChatIcon className="w-6 h-6" />}
            </button>

            {isChatbotOpen && (
                <div className="fixed bottom-24 right-6 lg:bottom-28 lg:right-8 w-[90vw] max-w-md h-[70vh] max-h-[600px] z-40 animate-slide-in-right">
                    <div className="h-full flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-gray-200/80">
                         <div className="flex-shrink-0 flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm border-b border-gray-200/80">
                            <h3 className="text-lg font-bold text-gray-800 ml-2">AI Assistant</h3>
                            <button onClick={() => setIsChatbotOpen(false)} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full" aria-label="Close chatbot">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100/50 overflow-hidden">
                           <ChatWindow
                                messages={chatbotMessages}
                                onSendMessage={handleSendChatbotMessage}
                                isLoading={isChatbotLoading}
                                isRecording={false}
                                onStartRecording={() => {}}
                                onStopRecording={() => {}}
                                transcription=""
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
