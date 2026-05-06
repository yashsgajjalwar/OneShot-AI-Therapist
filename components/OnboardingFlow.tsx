
import React, { useState, useEffect } from 'react';
import { UserProfile, GoogleUser } from '../types';
import { CheckIcon } from './Icons';

interface OnboardingFlowProps {
    onComplete: (profile: UserProfile) => void;
    googleUser: GoogleUser;
}

const commonReasons = [
    "Managing Stress",
    "Coping with Anxiety",
    "Relationship Issues",
    "Feeling Down or Depressed",
    "PTSD & Trauma Recovery",
    "Schizophrenia Support",
    "Alzheimer's & Memory Support",
    "Improving Self-Esteem",
    "Work/School Pressure",
    "Personal Growth",
];

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, googleUser }) => {
    const [step, setStep] = useState(1);
    const [profileData, setProfileData] = useState<UserProfile>({
        name: '',
        demographics: { age: '', gender: '' },
        reasons: [],
        goals: '',
    });

    useEffect(() => {
        if (googleUser) {
            setProfileData(p => ({ ...p, name: googleUser.name }));
        }
    }, [googleUser]);
    
    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleReasonToggle = (reason: string) => {
        setProfileData(prev => {
            const newReasons = prev.reasons.includes(reason)
                ? prev.reasons.filter(r => r !== reason)
                : [...prev.reasons, reason];
            return { ...prev, reasons: newReasons };
        });
    };
    
    const isNextDisabled = () => {
        switch (step) {
            case 2: return !profileData.name.trim();
            case 3: return profileData.reasons.length === 0;
            case 4: return !profileData.goals.trim();
            default: return false;
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Welcome to OneShot, {googleUser.name}</h1>
                        <p className="mt-4 text-gray-600">Your personal emotional wellness assistant. Let's get started by creating a personalized profile for you. This will help tailor your sessions to your specific needs.</p>
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                            <strong>Note:</strong> OneShot provides support and companionship but is not a replacement for professional medical treatment or emergency services.
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Tell us about yourself</h2>
                        <p className="mt-2 text-sm text-gray-500 mb-6">This information helps me understand you better.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">What should I call you?*</label>
                                <input
                                    type="text"
                                    value={profileData.name}
                                    onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Your Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Age (Optional)</label>
                                <input
                                    type="text"
                                    value={profileData.demographics.age}
                                    onChange={e => setProfileData(p => ({ ...p, demographics: { ...p.demographics, age: e.target.value } }))}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., 25"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Gender (Optional)</label>
                                <input
                                    type="text"
                                    value={profileData.demographics.gender}
                                    onChange={e => setProfileData(p => ({ ...p, demographics: { ...p.demographics, gender: e.target.value } }))}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., Woman, Man, Non-binary"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 3:
                 return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">What brings you here?</h2>
                        <p className="mt-2 text-sm text-gray-500 mb-6">Select all that apply. This helps me tailor my therapeutic approach.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {commonReasons.map(reason => {
                                const isSelected = profileData.reasons.includes(reason);
                                return (
                                    <button
                                        key={reason}
                                        onClick={() => handleReasonToggle(reason)}
                                        className={`p-3 text-left text-sm font-medium rounded-lg border transition-all ${isSelected ? 'bg-indigo-100 border-indigo-500 text-indigo-800 ring-2 ring-indigo-300' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-800'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{reason}</span>
                                            {isSelected && <CheckIcon className="w-5 h-5 text-indigo-600" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">What are your goals?</h2>
                        <p className="mt-2 text-sm text-gray-500 mb-6">Briefly describe what you hope to achieve.</p>
                        <textarea
                            value={profileData.goals}
                            onChange={e => setProfileData(p => ({ ...p, goals: e.target.value }))}
                            className="mt-1 block w-full h-40 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="My goals are..."
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 p-4">
            <div className="w-full max-w-2xl p-8 bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl transition-all duration-500">
                <div className="mb-6">
                    <div className="h-2 w-full bg-gray-200 rounded-full">
                        <div 
                            className="h-2 bg-indigo-500 rounded-full transition-all duration-500" 
                            style={{ width: `${(step / 4) * 100}%` }}>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 text-right mt-1">Step {step} of 4</p>
                </div>

                <div className="min-h-[350px]">
                    {renderStep()}
                </div>
                
                <div className="flex justify-between items-center mt-8">
                    <button
                        onClick={handleBack}
                        disabled={step === 1}
                        className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                        Back
                    </button>
                    {step < 4 ? (
                        <button
                            onClick={handleNext}
                            disabled={isNextDisabled()}
                            className="px-6 py-2 text-sm font-medium text-white bg-indigo-500 rounded-full hover:bg-indigo-600 disabled:bg-indigo-300 transition-colors"
                        >
                            Next
                        </button>
                    ) : (
                         <button
                            onClick={() => onComplete(profileData)}
                            disabled={isNextDisabled()}
                            className="px-6 py-2 text-sm font-medium text-white bg-indigo-500 rounded-full hover:bg-indigo-600 disabled:bg-indigo-300 transition-colors"
                        >
                            Start Session
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingFlow;
