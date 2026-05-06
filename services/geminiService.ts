
import { GoogleGenAI, Chat, GenerateContentResponse, LiveServerMessage, Modality, Blob, Part, Type } from "@google/genai";
import { UserProfile } from "../types";

// --- Audio Utility Functions (as per Gemini Docs) ---

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Specialized System Instruction Generator ---

const getSpecializedInstruction = (profile: UserProfile): string => {
    let instruction = `You are OneShot, a compassionate and empathetic Cognitive AI Therapist.`;
    
    // Core Profile
    instruction += `\n\n## Client Profile:\n- Name: ${profile.name}\n- Reasons: ${profile.reasons.join(', ')}\n- Goals: "${profile.goals}"`;

    const reasons = profile.reasons.map(r => r.toLowerCase());
    const isSchizophrenia = reasons.some(r => r.includes('schizophrenia'));
    const isPTSD = reasons.some(r => r.includes('ptsd') || r.includes('trauma'));
    const isAlzheimers = reasons.some(r => r.includes('alzheimer') || r.includes('memory'));

    // Inject Safety Plan if available (Crucial for PTSD/Schizophrenia)
    if (profile.safetyPlan && (isSchizophrenia || isPTSD)) {
        instruction += `\n\n## CRITICAL: CLIENT SAFETY PLAN
        The client has established the following safety protocols. If they show signs of distress matching the "Warning Signs", explicitly remind them of their "Coping Strategies".
        - Warning Signs: "${profile.safetyPlan.warningSigns}"
        - Coping Strategies: "${profile.safetyPlan.copingStrategies}"
        - Social Support: "${profile.safetyPlan.socialSupport}"
        `;
    }

    // Inject Memories if available (Crucial for Alzheimer's Reminiscence)
    if (profile.memories && profile.memories.length > 0 && isAlzheimers) {
        instruction += `\n\n## REMINISCENCE CONTEXT
        The client has shared key memories. Use these to gently prompt conversation or ground them if they are confused.
        Memories:
        ${profile.memories.map(m => `- ${m.description} (${m.date || 'unknown date'})`).join('\n')}
        `;
    }

    // 1. Schizophrenia Protocol
    if (isSchizophrenia) {
        instruction += `\n\n## PROTOCOL: SCHIZOPHRENIA SUPPORT
        - **Reality Testing:** If the user expresses delusions or hallucinations, do not validate them as factual, but DO validate the emotions they cause (e.g., "That sounds very frightening for you," not "Yes, I see the spies too").
        - **Clarity:** Use clear, unambiguous, and concrete language. Avoid abstract metaphors.
        - **Safety Plan Reference:** If the user seems unstable, ask: "Does this feel like one of your warning signs we discussed?"
        - **Medication:** Gently support adherence to their prescribed medical regimen without giving medical advice.`;
    } 
    // 2. PTSD Protocol
    else if (isPTSD) {
        instruction += `\n\n## PROTOCOL: PTSD & TRAUMA-INFORMED CARE
        - **Safety First:** Prioritize emotional safety and stabilization.
        - **Grounding:** If the user seems dissociated, distressed, or having a flashback, guide them through "here and now" grounding exercises.
        - **Safety Plan Reference:** Remind them of their specific coping strategies defined in their profile: "${profile.safetyPlan?.copingStrategies || 'breathing, grounding'}".
        - **No Retraumatization:** Do not push for details of traumatic events. Allow the user to lead.`;
    }
    // 3. Alzheimer's Protocol
    else if (isAlzheimers) {
        instruction += `\n\n## PROTOCOL: ALZHEIMER'S & MEMORY SUPPORT
        - **Reminiscence Therapy:** Proactively ask about the memories listed above. E.g., "Tell me more about [memory description]."
        - **Validation Therapy:** If the user is confused about time/place, validate the *emotion* behind the request rather than harshly correcting the fact.
        - **Simplicity:** Keep sentences short and simple. Be patient with repetition.
        - **Tone:** Maintain a warm, reassuring, and calm tone at all times.`;
    }
    // Standard CBT Protocol
    else {
        instruction += `\n\n## PROTOCOL: GENERAL CBT
        - Analyze mood logs and provide gentle, therapeutic observations.
        - Help the user identify cognitive distortions.
        - Keep responses concise and focused.`;
    }

    return instruction;
};

// --- Gemini Service ---

let ai: GoogleGenAI | null = null;
const getAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


let chat: Chat | null = null;
let currentProfileId: string | null = null; // To track if the profile has changed

const getChat = (profile: UserProfile | null) => {
    // We include the length of memories/safety plan in the ID so if they update, we re-create the chat
    const profileHash = profile ? 
        JSON.stringify({ 
            id: profile.name, 
            m: profile.memories?.length, 
            s: profile.safetyPlan?.warningSigns 
        }) : 'default';

    if (!chat || currentProfileId !== profileHash) {
        const aiInstance = getAI();
        let systemInstruction = "";

        if (profile) {
            systemInstruction = getSpecializedInstruction(profile);
        } else {
             systemInstruction = `You are OneShot, a compassionate and empathetic Cognitive AI Therapist.`;
        }

        chat = aiInstance.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
            },
        });
        currentProfileId = profileHash;
    }
    return chat;
}

export const sendMessageToAI = async (message: string, profile: UserProfile | null): Promise<GenerateContentResponse> => {
    const chatInstance = getChat(profile);
    try {
        const response = await chatInstance.sendMessage({ message });
        return response;
    } catch (e) {
        console.error("Chat error, resetting chat:", e);
        chat = null; // Reset chat on error
        throw e;
    }
};

// --- CBT Analysis Service ---
export const analyzeCBTEntry = async (
    situation: string,
    thought: string,
    belief: number,
    distortions: string[]
  ): Promise<{ balancedThought: string; reframingQuestion: string }> => {
      const aiInstance = getAI();
      const prompt = `
        Act as an expert CBT Therapist.
        Analyze the following Thought Record:
        - Situation: "${situation}"
        - Automatic Negative Thought: "${thought}"
        - Belief in Thought: ${belief}%
        - Identified Distortions: ${distortions.join(', ')}
  
        Provide a compassionate, balanced alternative thought and a specific reframing question to help the user challenge this negative thought further.
      `;
  
      const response = await aiInstance.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      balancedThought: { type: Type.STRING },
                      reframingQuestion: { type: Type.STRING }
                  },
                  required: ["balancedThought", "reframingQuestion"]
              }
          }
      });
  
      const jsonText = response.text || "{}";
      return JSON.parse(jsonText);
  };

// --- General Purpose Chatbot Service ---
let generalChat: Chat | null = null;

const getGeneralChat = () => {
    if (!generalChat) {
        const aiInstance = getAI();
        generalChat = aiInstance.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a helpful and friendly general-purpose AI assistant. Answer any question concisely and accurately. Your primary function is to assist users of the OneShot Cognitive AI Therapist app with general queries, but you are not limited to that scope.',
            },
        });
    }
    return generalChat;
}

export const sendGeneralChatMessage = async (
    message: string,
    image?: { mimeType: string; data: string }
): Promise<GenerateContentResponse> => {
    const chatInstance = getGeneralChat();
    
    // Explicitly typing as any[] to avoid potential type mismatch if Part isn't exported correctly,
    // though it should be fine.
    const parts: any[] = [];
    if (image) {
        parts.push({
            inlineData: {
                mimeType: image.mimeType,
                data: image.data,
            }
        });
    }
    if (message) {
        parts.push({ text: message });
    }

    try {
        const response = await chatInstance.sendMessage({ message: parts });
        return response;
    } catch (error) {
        console.error("General chat error, resetting:", error);
        generalChat = null; // Force reset on error
        throw error;
    }
};


// --- Text to Speech Service ---
let ttsAudioContext: AudioContext | null = null;
const getTtsAudioContext = () => {
    if (!ttsAudioContext || ttsAudioContext.state === 'closed') {
        ttsAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return ttsAudioContext;
}

export const textToSpeech = async (text: string): Promise<void> => {
    try {
        const aiInstance = getAI();
        const response = await aiInstance.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' }, // A calm, suitable voice
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const audioContext = getTtsAudioContext();
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                audioContext,
                24000,
                1,
            );
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();

            return new Promise(resolve => {
                source.onended = () => resolve();
            });
        }
    } catch (error) {
        console.error("Text to Speech failed:", error);
        // Do not throw, just log, so the UI doesn't break if TTS fails
    }
};

// --- Live Conversation Service ---
export class LiveConversationService {
    private inputAudioContext: AudioContext;
    private outputAudioContext: AudioContext;
    private sessionPromise: Promise<any> | null = null;
    private mediaStream: MediaStream | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    private nextStartTime = 0;
    private sources = new Set<AudioBufferSourceNode>();

    constructor(
        private profile: UserProfile | null,
        private onInputTranscription: (text: string) => void,
        private onOutputTranscription: (text: string) => void,
        private onTurnComplete: (input: string, output: string) => void,
        private onError: (error: any) => void
    ) {
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    private createBlob(data: Float32Array): Blob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    }
    
    async start() {
        if (this.sessionPromise) return;

        try {
            const aiInstance = getAI();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaStream = stream;

            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            const profile = this.profile;
            let systemInstruction = "";
            
            if (profile) {
                // Reuse the specialized instruction logic for live mode
                systemInstruction = getSpecializedInstruction(profile);
                systemInstruction += `\n\n**LIVE VOICE MODE INSTRUCTIONS**:\n- Respond concisely.\n- Use a calm, slow, and reassuring voice tone.\n- Listen for emotional cues.`;
            } else {
                 systemInstruction = `You are OneShot, a compassionate Cognitive AI Therapist. Respond with gentle empathy. Keep responses concise.`;
            }

            this.sessionPromise = aiInstance.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (!this.sessionPromise) return;

                        this.mediaStreamSource = this.inputAudioContext.createMediaStreamSource(stream);
                        this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
                        
                        this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = this.createBlob(inputData);
                            this.sessionPromise?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        this.mediaStreamSource.connect(this.scriptProcessor);
                        this.scriptProcessor.connect(this.inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            currentInputTranscription += text;
                            this.onInputTranscription(currentInputTranscription);
                        }
                        if (message.serverContent?.outputTranscription) {
                            const text = message.serverContent.outputTranscription.text;
                            currentOutputTranscription += text;
                            this.onOutputTranscription(currentOutputTranscription);
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            this.playAudioChunk(base64Audio);
                        }

                        if (message.serverContent?.interrupted) {
                            this.stopAllPlayback();
                        }

                        if (message.serverContent?.turnComplete) {
                            this.onTurnComplete(currentInputTranscription, currentOutputTranscription);
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Live session error:", e);
                        this.onError(e);
                        this.stop();
                    },
                    onclose: (e: CloseEvent) => {
                        console.log("Live session closed.");
                        this.stop();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction,
                },
            });
        } catch (error) {
            console.error("Failed to start live conversation:", error);
            this.onError(error);
        }
    }

    private async playAudioChunk(base64Audio: string) {
        this.nextStartTime = Math.max(
            this.nextStartTime,
            this.outputAudioContext.currentTime,
        );
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            this.outputAudioContext,
            24000,
            1,
        );
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        source.addEventListener('ended', () => {
            this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime = this.nextStartTime + audioBuffer.duration;
        this.sources.add(source);
    }

    private stopAllPlayback() {
        for (const source of this.sources.values()) {
            try {
                source.stop();
            } catch (e) {
                // Ignore errors if source already stopped
            }
            this.sources.delete(source);
        }
        this.nextStartTime = 0;
    }

    async stop() {
        if (this.sessionPromise) {
            this.sessionPromise.then(session => session.close()).catch(e => console.error("Error closing session:", e));
            this.sessionPromise = null;
        }

        this.stopAllPlayback();

        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor.onaudioprocess = null;
            this.scriptProcessor = null;
        }
        if (this.mediaStreamSource) {
            this.mediaStreamSource.disconnect();
            this.mediaStreamSource = null;
        }
        
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
        
        if (this.inputAudioContext.state !== 'closed') {
           this.inputAudioContext.close().catch(e => console.error("Error closing input context:", e));
        }
        if (this.outputAudioContext.state !== 'closed') {
            this.outputAudioContext.close().catch(e => console.error("Error closing output context:", e));
         }

        // Re-initialize for next session
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
}
