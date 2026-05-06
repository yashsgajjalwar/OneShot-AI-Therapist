
import React, { useState } from 'react';
import { MoodEntry, HealthLog, CBTEntry, UserProfile } from '../types';
import MoodTrackerPanel from './MoodTrackerPanel';
import CBTToolPanel from './CBTToolPanel';
import GroundingPanel from './GroundingPanel';
import SpecializedTools from './SpecializedTools';

interface EmotionDashboardProps {
    currentIntervention: string;
    moodLogs: Record<string, MoodEntry[]>;
    healthLogs: Record<string, HealthLog>;
    cbtEntries: CBTEntry[];
    userProfile: UserProfile; // Added prop
    onLogMood: (rating: number, note: string) => void;
    onLogHealth: (sleep: number, activity: HealthLog['activity']) => void;
    onSaveCBTEntry: (entry: CBTEntry) => void;
    onAskAboutMoodPatterns: () => void;
    onUpdateProfile: (profile: UserProfile) => void; // Added prop
}

const EmotionDashboard: React.FC<EmotionDashboardProps> = ({ 
    currentIntervention, 
    moodLogs, 
    healthLogs,
    cbtEntries,
    userProfile,
    onLogMood, 
    onLogHealth,
    onSaveCBTEntry,
    onAskAboutMoodPatterns,
    onUpdateProfile
}) => {
    const [activeTab, setActiveTab] = useState<'mood' | 'cbt' | 'grounding' | 'care'>('mood');

    // Determine if user needs care tab
    const reasons = userProfile.reasons.map(r => r.toLowerCase());
    const hasSpecialNeeds = reasons.some(r => r.includes('alzheimer') || r.includes('memory') || r.includes('ptsd') || r.includes('trauma') || r.includes('schizophrenia'));

    return (
        <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Tab Navigation */}
            <div className="flex bg-white/40 backdrop-blur-md rounded-xl p-1 shadow-sm border border-white/40 flex-shrink-0 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('mood')}
                    className={`flex-1 min-w-[60px] py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'mood' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Mood
                </button>
                <button
                    onClick={() => setActiveTab('cbt')}
                    className={`flex-1 min-w-[60px] py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'cbt' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    CBT
                </button>
                <button
                    onClick={() => setActiveTab('grounding')}
                    className={`flex-1 min-w-[60px] py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'grounding' 
                        ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100' 
                        : 'text-gray-500 hover:text-red-500'
                    }`}
                >
                    SOS
                </button>
                {hasSpecialNeeds && (
                    <button
                        onClick={() => setActiveTab('care')}
                        className={`flex-1 min-w-[60px] py-2 text-sm font-bold rounded-lg transition-all ${
                            activeTab === 'care' 
                            ? 'bg-teal-50 text-teal-600 shadow-sm ring-1 ring-teal-100' 
                            : 'text-gray-500 hover:text-teal-500'
                        }`}
                    >
                        Care+
                    </button>
                )}
            </div>

            {/* Content Area - Fixed height container to allow internal scrolling */}
            <div className="flex-shrink-0 min-h-[500px] lg:min-h-[600px] flex flex-col bg-white/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-1">
                {activeTab === 'mood' && (
                     <MoodTrackerPanel 
                        moodLogs={moodLogs}
                        healthLogs={healthLogs}
                        onLogMood={onLogMood}
                        onLogHealth={onLogHealth}
                        onAskAI={onAskAboutMoodPatterns}
                    />
                )}
                {activeTab === 'cbt' && (
                    <div className="flex-1 p-5 h-full overflow-hidden">
                        <CBTToolPanel 
                            entries={cbtEntries}
                            onSaveEntry={onSaveCBTEntry}
                        />
                    </div>
                )}
                {activeTab === 'grounding' && (
                    <div className="flex-1 h-full overflow-hidden">
                        <GroundingPanel />
                    </div>
                )}
                {activeTab === 'care' && (
                    <div className="flex-1 p-5 h-full overflow-hidden">
                        <SpecializedTools profile={userProfile} onUpdateProfile={onUpdateProfile} />
                    </div>
                )}
            </div>

            {/* Intervention Card */}
            <div className="flex-shrink-0 p-6 bg-white/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/30">
                <h3 className="text-xl font-bold text-gray-700 mb-3">Therapeutic Suggestion</h3>
                <div className="p-4 bg-indigo-100 rounded-lg">
                    <p className="text-indigo-800 italic">
                        {currentIntervention || "I'm here to listen. Feel free to share what's on your mind."}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmotionDashboard;
