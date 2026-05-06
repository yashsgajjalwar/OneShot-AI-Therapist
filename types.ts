
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  sources?: GroundingSource[];
  image?: string; // For image uploads
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface MemoryItem {
    id: string;
    description: string;
    imageBase64?: string; // Storing small images locally for the context
    date?: string;
}

export interface SafetyPlan {
    warningSigns: string;
    copingStrategies: string;
    socialSupport: string;
    professionalContact: string;
}

export interface UserProfile {
    name: string;
    demographics: {
        age?: string;
        gender?: string;
    };
    reasons: string[];
    goals: string;
    // New Personalized Fields
    memories?: MemoryItem[];
    safetyPlan?: SafetyPlan;
}

export interface MoodEntry {
    id: string;
    timestamp: number; // Epoch time
    rating: number; // 1-5
    note?: string;
}

// Helper type for the application state, though often used as MoodEntry[]
export interface DailyMoodLog {
    date: string;
    entries: MoodEntry[];
}

export interface HealthLog {
    date: string;
    sleepHours: number;
    activity: 'Sedentary' | 'Light' | 'Moderate' | 'Active';
}

export interface MoodLog {
    // Deprecated in favor of MoodEntry for new logic
    date: string; 
    rating: number; 
    note?: string;
}

export interface CBTEntry {
  id: string;
  timestamp: number;
  situation: string;
  negativeThought: string;
  beliefRating: number; // 1-100
  distortions: string[];
  balancedThought?: string;
  reframingQuestion?: string;
}

export const COGNITIVE_DISTORTIONS = [
  "All-or-Nothing Thinking",
  "Overgeneralization",
  "Mental Filter",
  "Disqualifying the Positive",
  "Jumping to Conclusions",
  "Magnification (Catastrophizing)",
  "Emotional Reasoning",
  "Should Statements",
  "Labeling",
  "Personalization"
];

export enum Emotion {
    Happy = 'Happy',
    Sad = 'Sad',
    Angry = 'Angry',
    Fearful = 'Fearful',
    Disgust = 'Disgust',
    Surprise = 'Surprise',
    Neutral = 'Neutral',
}

export const MoodScale: Record<number, { label: string; emoji: string; color: string; bgColor: string }> = {
    1: { label: 'Very Sad', emoji: '😭', color: '#ef4444', bgColor: '#fee2e2' }, 
    2: { label: 'Sad', emoji: '😢', color: '#60a5fa', bgColor: '#dbeafe' }, 
    3: { label: 'Neutral', emoji: '😐', color: '#9ca3af', bgColor: '#f3f4f6' },
    4: { label: 'Happy', emoji: '😊', color: '#4ade80', bgColor: '#dcfce7' },
    5: { label: 'Very Happy', emoji: '😁', color: '#facc15', bgColor: '#fef9c3' },
};
