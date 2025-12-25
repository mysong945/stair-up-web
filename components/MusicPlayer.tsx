"use client";
import { useState, useRef } from 'react';

export default function MusicPlayer() {
    const [isMuted, setIsMuted] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const toggleMute = () => {
        if (audioRef.current) {
            if (isMuted) {
                audioRef.current.muted = false;
                audioRef.current.play();
            } else {
                audioRef.current.muted = true;
            }
            setIsMuted(!isMuted);
        }
    };

    return (
        <div className="fixed top-6 right-6 z-50">
            <button
                onClick={toggleMute}
                className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 transition-all border border-white/30 text-white"
            >
                {isMuted ? (
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" /></svg>
                ) : (
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="animate-pulse"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
                )}
            </button>
            <audio ref={audioRef} src="/jingle-bells.mp3" loop muted />
        </div>
    );
}