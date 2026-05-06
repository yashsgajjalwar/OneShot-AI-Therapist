
import React, { useRef, useEffect } from 'react';
import { Emotion } from '../types';

interface VideoFeedProps {
  currentEmotion: Emotion;
}

const emotionColors: Record<Emotion, string> = {
    [Emotion.Happy]: 'border-green-400',
    [Emotion.Sad]: 'border-blue-400',
    [Emotion.Angry]: 'border-red-400',
    [Emotion.Fearful]: 'border-purple-400',
    [Emotion.Disgust]: 'border-yellow-600',
    [Emotion.Surprise]: 'border-pink-400',
    [Emotion.Neutral]: 'border-gray-400',
};

const emotionEmojis: Record<Emotion, string> = {
    [Emotion.Happy]: '😊',
    [Emotion.Sad]: '😢',
    [Emotion.Angry]: '😠',
    [Emotion.Fearful]: '😨',
    [Emotion.Disgust]: '🤢',
    [Emotion.Surprise]: '😲',
    [Emotion.Neutral]: '😐',
}

const VideoFeed: React.FC<VideoFeedProps> = ({ currentEmotion }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
      }
    }
    setupCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black/50 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm border border-white/20">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
      <div className={`absolute inset-0 border-4 ${emotionColors[currentEmotion]} rounded-2xl transition-all duration-500`}></div>
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-lg shadow-xl transition-all duration-500">
        <span className="mr-2">{emotionEmojis[currentEmotion]}</span>
        Detected Emotion: <strong>{currentEmotion}</strong>
      </div>
    </div>
  );
};

export default VideoFeed;
