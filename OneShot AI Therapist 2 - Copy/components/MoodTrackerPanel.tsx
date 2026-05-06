
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MoodEntry, MoodScale, HealthLog } from '../types';
import { AnalyzeIcon } from './Icons';

interface MoodTrackerPanelProps {
    moodLogs: Record<string, MoodEntry[]>;
    healthLogs: Record<string, HealthLog>;
    onLogMood: (rating: number, note: string) => void;
    onLogHealth: (sleep: number, activity: HealthLog['activity']) => void;
    onAskAI: () => void;
}

const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const avgRating = Math.round(data.average);
      const moodInfo = MoodScale[avgRating] || MoodScale[3];
      
      return (
        <div className="p-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 text-sm">
          <p className="font-bold text-gray-800 mb-1">{label}</p>
          <div className="flex items-center gap-2 mb-1">
             <span>{moodInfo.emoji}</span>
             <span style={{ color: moodInfo.color }}>Avg: {moodInfo.label}</span>
          </div>
          <p className="text-gray-500 text-xs">{data.count} entries</p>
          {data.health && (
            <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">🌙 Sleep: {data.health.sleepHours}h</p>
                <p className="text-xs text-gray-600">🏃 Activity: {data.health.activity}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

const MoodTrackerPanel: React.FC<MoodTrackerPanelProps> = ({ moodLogs, healthLogs, onLogMood, onLogHealth, onAskAI }) => {
    const todayStr = getTodayDateString();
    const todayEntries = moodLogs[todayStr] || [];
    const todayHealth = healthLogs[todayStr];

    const [selectedMood, setSelectedMood] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [checkInDue, setCheckInDue] = useState(false);

    // Health UI State
    const [sleepHours, setSleepHours] = useState(7);
    const [activityLevel, setActivityLevel] = useState<HealthLog['activity']>('Moderate');

    // Sync state with props when todayHealth changes
    useEffect(() => {
        if (todayHealth) {
            setSleepHours(todayHealth.sleepHours);
            setActivityLevel(todayHealth.activity);
        }
    }, [todayHealth]);

    // Polling Mechanism: Check if the user hasn't logged in a while (e.g., 4 hours)
    useEffect(() => {
        const checkTime = () => {
            if (todayEntries.length === 0) {
                setCheckInDue(true);
                return;
            }
            const lastEntry = todayEntries[todayEntries.length - 1];
            const now = Date.now();
            const diffHours = (now - lastEntry.timestamp) / (1000 * 60 * 60);
            
            setCheckInDue(diffHours > 4);
        };

        checkTime();
        const interval = setInterval(checkTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [todayEntries]);

    const handleLogMood = () => {
        if (selectedMood) {
            onLogMood(selectedMood, note.trim());
            setSelectedMood(null);
            setNote('');
            setCheckInDue(false);
        }
    };
    
    const handleSaveHealth = () => {
        onLogHealth(sleepHours, activityLevel);
    };

    const chartData = useMemo(() => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const entries = moodLogs[dateStr] || [];
            const health = healthLogs[dateStr];
            
            let average = 0;
            if (entries.length > 0) {
                const sum = entries.reduce((acc, curr) => acc + curr.rating, 0);
                average = sum / entries.length;
            }

            data.push({
                name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                average: average,
                count: entries.length,
                roundedRating: Math.round(average) || 0,
                health: health
            });
        }
        return data;
    }, [moodLogs, healthLogs]);

    return (
        <div className="flex-shrink-0 p-6 bg-white/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-700">Mood & Vitals</h3>
                <button 
                    onClick={onAskAI}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-full hover:bg-indigo-600 transition-colors shadow"
                    title="Ask AI to analyze your mood swings and health correlations"
                >
                    <AnalyzeIcon className="w-4 h-4" />
                    <span>Analyze</span>
                </button>
            </div>

            {/* Input Section */}
            <div className="bg-white/50 rounded-xl p-4 border border-white/40 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold text-gray-700 text-sm">
                        {checkInDue ? "Time for a check-in! How are you feeling?" : "Log current mood"}
                    </p>
                    {checkInDue && <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>}
                </div>
                
                <div className="flex justify-between items-center mb-3">
                    {Object.entries(MoodScale).map(([rating, { emoji, label, color }]) => (
                        <button
                            key={rating}
                            onClick={() => setSelectedMood(Number(rating))}
                            className={`p-2 rounded-full text-2xl transition-all transform hover:scale-110 ${selectedMood === Number(rating) ? 'scale-125 bg-white shadow-md ring-2 ring-indigo-200' : 'opacity-70 hover:opacity-100'}`}
                            title={label}
                        >
                            <div className="flex flex-col items-center">
                                <span>{emoji}</span>
                            </div>
                        </button>
                    ))}
                </div>
                
                {selectedMood && (
                    <div className="animate-slide-in-left space-y-2">
                         <div className="text-center text-sm font-bold mb-1" style={{color: MoodScale[selectedMood].color}}>
                            {MoodScale[selectedMood].label}
                        </div>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note (optional)..."
                            className="w-full text-sm p-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white/80"
                        />
                        <button
                            onClick={handleLogMood}
                            className="w-full py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                        >
                            Log Entry
                        </button>
                    </div>
                )}
            </div>

             {/* Daily Vitals Section */}
             <div className="bg-white/50 rounded-xl p-4 border border-white/40 shadow-sm">
                <h4 className="font-semibold text-gray-700 text-sm mb-3">Daily Vitals</h4>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Sleep Duration</span>
                            <span className="font-bold">{sleepHours} hours</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="12" 
                            step="0.5"
                            value={sleepHours} 
                            onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                            className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                    <div>
                         <p className="text-xs text-gray-600 mb-2">Activity Level</p>
                         <div className="flex justify-between gap-2">
                             {(['Sedentary', 'Light', 'Moderate', 'Active'] as const).map(level => (
                                 <button
                                    key={level}
                                    onClick={() => setActivityLevel(level)}
                                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${activityLevel === level ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                 >
                                     {level}
                                 </button>
                             ))}
                         </div>
                    </div>
                    <button onClick={handleSaveHealth} className="w-full py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors">
                        Save Vitals
                    </button>
                </div>
            </div>

            {/* Today's Timeline */}
            {todayEntries.length > 0 && (
                <div className="max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    <h4 className="font-semibold text-gray-600 text-xs uppercase tracking-wider mb-2">Today's Timeline</h4>
                    <div className="space-y-2 relative pl-4 border-l-2 border-indigo-100 ml-2">
                        {todayEntries.slice().reverse().map((entry) => (
                            <div key={entry.id} className="relative flex items-start gap-3">
                                <div className="absolute -left-[21px] top-1 bg-white rounded-full p-1 border border-indigo-100 shadow-sm">
                                    <span className="text-xs">{MoodScale[entry.rating].emoji}</span>
                                </div>
                                <div className="flex-1 bg-white/40 p-2 rounded-lg text-xs">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-gray-700">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span style={{ color: MoodScale[entry.rating].color }} className="font-medium">{MoodScale[entry.rating].label}</span>
                                    </div>
                                    {entry.note && <p className="text-gray-500 mt-1 italic">"{entry.note}"</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Chart */}
            <div className="h-40">
                 <h4 className="font-semibold text-gray-600 text-xs uppercase tracking-wider mb-2">7 Day History</h4>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 5]} tickCount={6} stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomBarTooltip />} cursor={{fill: 'rgba(99, 102, 241, 0.1)'}} />
                        <Bar dataKey="average" radius={[4, 4, 0, 0]} barSize={20}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.roundedRating > 0 ? MoodScale[entry.roundedRating].color : '#E5E7EB'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MoodTrackerPanel;