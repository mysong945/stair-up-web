"use client";
import { useState, useEffect } from 'react';

export default function Snowfall() {
    const [snowflakes, setSnowflakes] = useState<any[]>([]);

    useEffect(() => {
        setSnowflakes([...Array(50)].map(() => ({
            left: Math.random() * 100,
            top: Math.random() * 20,
            width: Math.random() * 5 + 2,
            height: Math.random() * 5 + 2,
            duration: Math.random() * 10 + 5,
            delay: Math.random() * 5,
        })));
    }, []);

    if (snowflakes.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-10">
            {snowflakes.map((flake, i) => (
                <div
                    key={i}
                    className="absolute bg-white rounded-full opacity-80"
                    style={{
                        left: `${flake.left}%`,
                        top: `-${flake.top}px`,
                        width: `${flake.width}px`,
                        height: `${flake.height}px`,
                        animation: `snow ${flake.duration}s linear infinite`,
                        animationDelay: `${flake.delay}s`,
                    }}
                />
            ))}
            <style jsx global>{`
                @keyframes snow {
                    0% { transform: translateY(0vh) translateX(0); }
                    100% { transform: translateY(110vh) translateX(20px); }
                }
            `}</style>
        </div>
    );
}