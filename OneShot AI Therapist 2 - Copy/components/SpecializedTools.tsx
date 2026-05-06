
import React, { useState, useRef } from 'react';
import { UserProfile, MemoryItem, SafetyPlan } from '../types';
import { PaperclipIcon, CheckIcon, ClearIcon } from './Icons';

interface SpecializedToolsProps {
    profile: UserProfile;
    onUpdateProfile: (updatedProfile: UserProfile) => void;
}

// --- Sub-Component: Memory Box (for Alzheimer's/Dementia) ---
const MemoryBox: React.FC<{ profile: UserProfile; onUpdate: (p: UserProfile) => void }> = ({ profile, onUpdate }) => {
    const [description, setDescription] = useState('');
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFilePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAddMemory = () => {
        if (!description) return;
        const newMemory: MemoryItem = {
            id: Date.now().toString(),
            description,
            imageBase64: filePreview || undefined,
            date: new Date().toLocaleDateString()
        };
        const updatedMemories = [...(profile.memories || []), newMemory];
        onUpdate({ ...profile, memories: updatedMemories });
        setDescription('');
        setFilePreview(null);
    };

    const handleRemoveMemory = (id: string) => {
        const updatedMemories = (profile.memories || []).filter(m => m.id !== id);
        onUpdate({ ...profile, memories: updatedMemories });
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="mb-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <h4 className="font-bold text-indigo-900 text-sm mb-2">Add New Memory</h4>
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                            id="memory-upload"
                        />
                        <label 
                            htmlFor="memory-upload" 
                            className={`flex items-center justify-center w-12 h-12 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${filePreview ? 'border-indigo-500 bg-indigo-100' : 'border-gray-300 hover:border-indigo-400 bg-white'}`}
                        >
                            {filePreview ? (
                                <img src={filePreview} alt="Preview" className="w-full h-full object-cover rounded-md opacity-80" />
                            ) : (
                                <PaperclipIcon className="w-5 h-5 text-gray-400" />
                            )}
                        </label>
                    </div>
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Who is this? What is happening?"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    />
                    <button
                        onClick={handleAddMemory}
                        disabled={!description}
                        className="px-4 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Save
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {(profile.memories || []).length === 0 ? (
                    <p className="text-center text-gray-400 text-sm mt-8 italic">No memories added yet. Upload photos to help OneShot spark conversations about the past.</p>
                ) : (
                    (profile.memories || []).slice().reverse().map(memory => (
                        <div key={memory.id} className="flex gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100 relative group">
                            {memory.imageBase64 && (
                                <img src={memory.imageBase64} alt="Memory" className="w-16 h-16 object-cover rounded-lg bg-gray-100" />
                            )}
                            <div className="flex-1">
                                <p className="text-gray-800 text-sm font-medium">{memory.description}</p>
                                <p className="text-xs text-gray-400 mt-1">Added: {memory.date}</p>
                            </div>
                            <button 
                                onClick={() => handleRemoveMemory(memory.id)}
                                className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <ClearIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- Sub-Component: Crisis Safety Plan (for PTSD/Schizophrenia) ---
const CrisisSafetyPlan: React.FC<{ profile: UserProfile; onUpdate: (p: UserProfile) => void }> = ({ profile, onUpdate }) => {
    const [plan, setPlan] = useState<SafetyPlan>(profile.safetyPlan || {
        warningSigns: '',
        copingStrategies: '',
        socialSupport: '',
        professionalContact: ''
    });
    const [isEditing, setIsEditing] = useState(!profile.safetyPlan);

    const handleSave = () => {
        onUpdate({ ...profile, safetyPlan: plan });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h4 className="font-bold text-red-900 mb-2">Edit Safety Plan</h4>
                    <p className="text-xs text-red-700 mb-4">OneShot will reference this plan during moments of high distress.</p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Warning Signs (Triggers)</label>
                            <textarea
                                value={plan.warningSigns}
                                onChange={e => setPlan({ ...plan, warningSigns: e.target.value })}
                                placeholder="e.g., Pacing, hearing whispers, heart racing..."
                                className="w-full p-2 text-sm rounded-lg border border-red-200 focus:ring-2 focus:ring-red-400 focus:outline-none"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Internal Coping Strategies</label>
                            <textarea
                                value={plan.copingStrategies}
                                onChange={e => setPlan({ ...plan, copingStrategies: e.target.value })}
                                placeholder="e.g., Deep breathing, listening to jazz, walking the dog..."
                                className="w-full p-2 text-sm rounded-lg border border-green-200 focus:ring-2 focus:ring-green-400 focus:outline-none"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">People I can ask for help</label>
                            <input
                                type="text"
                                value={plan.socialSupport}
                                onChange={e => setPlan({ ...plan, socialSupport: e.target.value })}
                                placeholder="e.g., My sister Sarah, Friend John..."
                                className="w-full p-2 text-sm rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            />
                        </div>
                    </div>
                    
                    <button
                        onClick={handleSave}
                        className="mt-4 w-full py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                        Save Plan
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-700">My Safety Plan</h3>
                <button 
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                >
                    Edit
                </button>
            </div>

            <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border-l-4 border-red-400 shadow-sm">
                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">Warning Signs</h5>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{plan.warningSigns || "Not set"}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-l-4 border-green-400 shadow-sm">
                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">My Coping Strategies</h5>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{plan.copingStrategies || "Not set"}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-l-4 border-blue-400 shadow-sm">
                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">Safe People</h5>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{plan.socialSupport || "Not set"}</p>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 mt-4">
                    <strong className="block mb-1">Note:</strong>
                    The AI Therapist has access to this plan and will remind you of these strategies if you appear distressed during a session.
                </div>
            </div>
        </div>
    );
};

const SpecializedTools: React.FC<SpecializedToolsProps> = ({ profile, onUpdateProfile }) => {
    const reasons = profile.reasons.map(r => r.toLowerCase());
    const isAlzheimers = reasons.some(r => r.includes('alzheimer') || r.includes('memory'));
    const isPTSDOrSchizo = reasons.some(r => r.includes('ptsd') || r.includes('trauma') || r.includes('schizophrenia'));

    if (isAlzheimers) {
        return (
            <div className="flex flex-col h-full">
                <div className="mb-2">
                    <h3 className="text-xl font-bold text-gray-700">Memory Box</h3>
                    <p className="text-xs text-gray-500">Upload photos to help OneShot reminisce with you.</p>
                </div>
                <MemoryBox profile={profile} onUpdate={onUpdateProfile} />
            </div>
        );
    }

    if (isPTSDOrSchizo) {
        return <CrisisSafetyPlan profile={profile} onUpdate={onUpdateProfile} />;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
            <p className="mb-2 text-lg">✨</p>
            <p className="text-sm">Based on your profile, no specialized clinical tools are required.</p>
            <p className="text-xs mt-2">Update your profile reasons to see specific tools for Memory or Safety planning.</p>
        </div>
    );
};

export default SpecializedTools;
