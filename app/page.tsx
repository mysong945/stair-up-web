"use client";

import MusicPlayer from '@/components/MusicPlayer';
import Snowfall from '@/components/Snowfall';
import RedHat from '@/components/RedHat';

export default function ChristmasPage() {
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e3a8a] to-[#312e81] flex flex-col items-center justify-center overflow-hidden">
      <Snowfall />
      <MusicPlayer />
      <div className="absolute top-10 left-10">
        <RedHat />
      </div>

      {/* 右上角红帽子装饰 */}
      <div className="absolute top-10 left-10 text-6xl animate-bounce drop-shadow-2xl" style={{ animationDuration: '3s' }}>
        🎅
      </div>

      <div className="relative flex flex-col items-center">
        {/* 圣诞树容器 */}
        <div className="relative flex flex-col items-center">
          {/* 顶部的星星 */}
          <div className="star text-5xl mb-[-15px] z-20 animate-pulse">⭐</div>

          {/* 圣诞树身 */}
          <div className="w-0 h-0 border-l-[70px] border-r-[70px] border-b-[90px] border-l-transparent border-r-transparent border-b-[#1b4332] drop-shadow-2xl" />
          <div className="w-0 h-0 border-l-[100px] border-r-[100px] border-b-[120px] border-l-transparent border-r-transparent border-b-[#2d6a4f] mt-[-50px] drop-shadow-2xl" />
          <div className="w-0 h-0 border-l-[130px] border-r-[130px] border-b-[150px] border-l-transparent border-r-transparent border-b-[#40916c] mt-[-70px] drop-shadow-2xl" />

          {/* 树干 */}
          <div className="w-14 h-16 bg-[#582f0e] rounded-b-lg" />

          {/* 装饰灯 */}
          <div className="absolute top-24 left-4 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          <div className="absolute top-44 right-6 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          <div className="absolute top-64 left-10 w-3 h-3 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* 圣诞老人和文字 */}
        <div className="mt-8 text-center animate-float">
          <div className="text-8xl mb-4 drop-shadow-lg">🎅</div>
          <h1 className="text-white text-4xl font-bold tracking-widest uppercase" style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
            Merry Christmas
          </h1>
          <h1 className="text-white text-4xl font-bold tracking-widest uppercase" style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
            Mengtong, 圣诞快乐！
          </h1>
          {/* 底部居中作者小字 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm opacity-50">
            Created ❤️ by MY Song
          </div>
        </div>
      </div>

      {/* 底部装饰：雪地感 */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}