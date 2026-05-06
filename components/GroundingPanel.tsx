
import React, { useState, useEffect } from 'react';

const GroundingPanel: React.FC = () => {
    const [mode, setMode] = useState<'menu' | '54321' | 'breathe'>('menu');
    const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
    const [breathCount, setBreathCount] = useState(4);

    // Breathing Animation Loop
    useEffect(() => {
        if (mode !== 'breathe') return;

        let timer: any;
        
        const runBreathCycle = () => {
            setBreathPhase('Inhale');
            setBreathCount(4);
            let c = 4;
            timer = setInterval(() => {
                c--;
                setBreathCount(c);
                if (c <= 0) {
                    clearInterval(timer);
                    // Hold
                    setBreathPhase('Hold');
                    setBreathCount(4);
                    c = 4;
                    timer = setInterval(() => {
                        c--;
                        setBreathCount(c);
                        if (c <= 0) {
                            clearInterval(timer);
                            // Exhale
                            setBreathPhase('Exhale');
                            setBreathCount(6);
                            c = 6;
                            timer = setInterval(() => {
                                c--;
                                setBreathCount(c);
                                if (c <= 0) {
                                    clearInterval(timer);
                                    runBreathCycle(); // Loop
                                }
                            }, 1000);
                        }
                    }, 1000);
                }
            }, 1000);
        };

        runBreathCycle();
        return () => clearInterval(timer);
    }, [mode]);

    if (mode === 'menu') {
        return (
            <div className="flex flex-col h-full p-4 items-center justify-center space-y-6">
                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800">Grounding & Safety</h3>
                    <p className="text-sm text-gray-500 mt-2">Immediate tools for high distress, anxiety, or dissociation.</p>
                </div>

                <div className="w-full space-y-3">
                    <button 
                        onClick={() => setMode('54321')}
                        className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 text-left transition-colors flex items-center gap-4"
                    >
                        <span className="text-3xl">🖐️</span>
                        <div>
                            <span className="font-bold text-indigo-900 block">5-4-3-2-1 Technique</span>
                            <span className="text-xs text-indigo-700">Sensory grounding for flashbacks & panic.</span>
                        </div>
                    </button>

                    <button 
                        onClick={() => setMode('breathe')}
                        className="w-full p-4 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 text-left transition-colors flex items-center gap-4"
                    >
                        <span className="text-3xl">🌬️</span>
                        <div>
                            <span className="font-bold text-teal-900 block">Box Breathing</span>
                            <span className="text-xs text-teal-700">Regulate nervous system immediately.</span>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    if (mode === '54321') {
        return (
            <div className="flex flex-col h-full p-4 relative">
                 <button onClick={() => setMode('menu')} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
                 <h3 className="text-lg font-bold text-indigo-900 mb-4 text-center">5-4-3-2-1 Grounding</h3>
                 <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                     <div className="bg-indigo-50 p-3 rounded-lg border-l-4 border-indigo-400">
                         <strong className="block text-indigo-800 text-lg mb-1">5 things you SEE</strong>
                         <p className="text-sm text-indigo-700">Look around. Notice details. A shadow? A color?</p>
                     </div>
                     <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                         <strong className="block text-blue-800 text-lg mb-1">4 things you FEEL</strong>
                         <p className="text-sm text-blue-700">Texture of your shirt? Feet on the floor?</p>
                     </div>
                     <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                         <strong className="block text-green-800 text-lg mb-1">3 things you HEAR</strong>
                         <p className="text-sm text-green-700">Traffic? Computer hum? Your breath?</p>
                     </div>
                     <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
                         <strong className="block text-orange-800 text-lg mb-1">2 things you SMELL</strong>
                         <p className="text-sm text-orange-700">Coffee? Fresh air? Or name 2 favorite smells.</p>
                     </div>
                     <div className="bg-pink-50 p-3 rounded-lg border-l-4 border-pink-400">
                         <strong className="block text-pink-800 text-lg mb-1">1 thing you TASTE</strong>
                         <p className="text-sm text-pink-700">Mouthwash? Coffee? Or a favorite taste.</p>
                     </div>
                 </div>
            </div>
        )
    }

    if (mode === 'breathe') {
        return (
            <div className="flex flex-col h-full p-4 items-center justify-center relative">
                <button onClick={() => setMode('menu')} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 text-sm">Stop</button>
                
                <h3 className="text-xl font-bold text-teal-800 mb-8">{breathPhase}</h3>
                
                <div className={`
                    w-48 h-48 rounded-full flex items-center justify-center border-4 border-teal-300 shadow-xl transition-all duration-1000
                    ${breathPhase === 'Inhale' ? 'scale-110 bg-teal-100' : ''}
                    ${breathPhase === 'Hold' ? 'scale-110 bg-teal-200' : ''}
                    ${breathPhase === 'Exhale' ? 'scale-90 bg-white' : ''}
                `}>
                    <span className="text-6xl font-bold text-teal-600">{breathCount}</span>
                </div>
                
                <p className="mt-8 text-center text-gray-500 max-w-xs">
                    Focus only on the circle. <br/>Inhale through nose, exhale through mouth.
                </p>
            </div>
        )
    }

    return null;
}

export default GroundingPanel;
