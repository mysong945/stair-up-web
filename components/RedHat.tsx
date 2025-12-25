"use client";

export default function RedHat() {
    return (
        <div className="relative scale-75 animate-bounce">
            {/* 帽子主体 */}
            <div className="w-20 h-16 bg-red-600 rounded-t-full relative">
                {/* 帽子顶部的白球 */}
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-white rounded-full shadow-md" />
            </div>
            {/* 檐边的白毛 */}
            <div className="w-24 h-6 bg-white rounded-full -ml-2 shadow-sm" />
        </div>
    );
}