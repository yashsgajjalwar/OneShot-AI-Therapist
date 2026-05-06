
import React, { useState } from 'react';
import { CBTEntry, COGNITIVE_DISTORTIONS } from '../types';
import { LoadingSpinnerIcon, CheckIcon, CloseIcon } from './Icons';
import { analyzeCBTEntry } from '../services/geminiService';

interface CBTToolPanelProps {
    entries: CBTEntry[];
    onSaveEntry: (entry: CBTEntry) => void;
}

const CBTToolPanel: React.FC<CBTToolPanelProps> = ({ entries, onSaveEntry }) => {
    const [view, setView] = useState<'list' | 'wizard'>('list');
    const [isLoading, setIsLoading] = useState(false);

    // Wizard State
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<{
        situation: string;
        negativeThought: string;
        beliefRating: number;
        distortions: string[];
    }>({
        situation: '',
        negativeThought: '',
        beliefRating: 50,
        distortions: []
    });

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const toggleDistortion = (distortion: string) => {
        setFormData(prev => {
            const exists = prev.distortions.includes(distortion);
            return {
                ...prev,
                distortions: exists 
                    ? prev.distortions.filter(d => d !== distortion)
                    : [...prev.distortions, distortion]
            };
        });
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const analysis = await analyzeCBTEntry(
                formData.situation,
                formData.negativeThought,
                formData.beliefRating,
                formData.distortions
            );
            
            const newEntry: CBTEntry = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                ...formData,
                ...analysis
            };

            onSaveEntry(newEntry);
            setView('list');
            // Reset form
            setFormData({ situation: '', negativeThought: '', beliefRating: 50, distortions: [] });
            setStep(1);
        } catch (error) {
            console.error("CBT Analysis failed", error);
            // Handle error (maybe show a toast)
        } finally {
            setIsLoading(false);
        }
    };

    if (view === 'list') {
        return (
            <div className="flex-1 overflow-hidden flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-700">Thought Journal</h3>
                    <button 
                        onClick={() => setView('wizard')}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                    >
                        New Entry
                    </button>
                </div>
                
                {entries.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-70">
                        <p className="text-center italic">"The happiness of your life depends upon the quality of your thoughts."</p>
                        <p className="text-sm mt-2">- Marcus Aurelius</p>
                        <p className="mt-8 text-sm font-semibold">Start your first thought record today.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-2">
                        {entries.slice().reverse().map(entry => (
                            <div key={entry.id} className="bg-white/60 p-4 rounded-xl shadow-sm border border-white/50 space-y-3">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs text-gray-500 font-mono">
                                        {new Date(entry.timestamp).toLocaleDateString()} • {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">
                                        Belief: {entry.beliefRating}%
                                    </span>
                                </div>
                                
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">Situation</p>
                                    <p className="text-gray-800 text-sm">{entry.situation}</p>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">Negative Thought</p>
                                    <p className="text-gray-800 text-sm italic">"{entry.negativeThought}"</p>
                                </div>

                                {entry.distortions.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {entry.distortions.map(d => (
                                            <span key={d} className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                                                {d}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="pt-3 border-t border-gray-200/50">
                                    <p className="text-xs font-bold text-indigo-600 uppercase">Balanced Perspective</p>
                                    <p className="text-gray-800 text-sm mt-1">{entry.balancedThought}</p>
                                    <p className="text-xs text-indigo-500 mt-2 font-medium">Reframing Q: {entry.reframingQuestion}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Wizard View
    return (
        <div className="flex-1 flex flex-col h-full relative">
            <button 
                onClick={() => setView('list')}
                className="absolute -top-1 -right-1 text-gray-400 hover:text-gray-600"
                aria-label="Cancel"
            >
                <CloseIcon className="w-5 h-5" />
            </button>

            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-700">The Thought Record</h3>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Step {step}/3</span>
                </div>
                <div className="h-1 w-full bg-gray-200 rounded-full">
                    <div className="h-1 bg-indigo-500 rounded-full transition-all duration-300" style={{width: `${(step/3)*100}%`}}></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
                {step === 1 && (
                    <div className="space-y-4 animate-slide-in-right">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Triggering Situation</label>
                            <p className="text-xs text-gray-500 mb-2">What happened? Who were you with? When/Where?</p>
                            <textarea
                                value={formData.situation}
                                onChange={e => setFormData({...formData, situation: e.target.value})}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-white/80 text-sm text-gray-900 placeholder-gray-500"
                                rows={3}
                                placeholder="e.g., I made a mistake in a meeting..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Automatic Negative Thought</label>
                            <p className="text-xs text-gray-500 mb-2">What went through your mind? What does this say about you?</p>
                            <textarea
                                value={formData.negativeThought}
                                onChange={e => setFormData({...formData, negativeThought: e.target.value})}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-white/80 text-sm text-gray-900 placeholder-gray-500"
                                rows={3}
                                placeholder="e.g., I'm incompetent and everyone knows it..."
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-slide-in-right py-4">
                        <div className="text-center">
                            <label className="block text-lg font-semibold text-gray-700 mb-2">How much do you believe this thought?</label>
                            <div className="text-4xl font-bold text-indigo-600 mb-4">{formData.beliefRating}%</div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={formData.beliefRating}
                                onChange={e => setFormData({...formData, beliefRating: Number(e.target.value)})}
                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>0% (Not at all)</span>
                                <span>100% (Completely)</span>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4 animate-slide-in-right">
                         <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Identify Cognitive Distortions</label>
                            <p className="text-xs text-gray-500 mb-3">Select any thinking traps that apply.</p>
                            <div className="grid grid-cols-2 gap-2">
                                {COGNITIVE_DISTORTIONS.map(distortion => (
                                    <button
                                        key={distortion}
                                        onClick={() => toggleDistortion(distortion)}
                                        className={`px-2 py-2 text-xs rounded-lg border text-left transition-colors ${
                                            formData.distortions.includes(distortion)
                                                ? 'bg-indigo-100 border-indigo-500 text-indigo-900 font-semibold'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{distortion}</span>
                                            {formData.distortions.includes(distortion) && <CheckIcon className="w-3 h-3" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-4 pt-4 border-t border-gray-200/50">
                {step > 1 ? (
                    <button onClick={handleBack} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Back
                    </button>
                ) : <div></div>}
                
                {step < 3 ? (
                    <button 
                        onClick={handleNext}
                        disabled={!formData.situation || !formData.negativeThought}
                        className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        Next
                    </button>
                ) : (
                    <button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        {isLoading ? <LoadingSpinnerIcon className="w-4 h-4" /> : 'Analyze & Reframe'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CBTToolPanel;
