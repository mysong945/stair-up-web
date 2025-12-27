'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenManager } from '@/lib/apiService';
import type { User, UserStats } from '@/lib/apiService';
import { TrendingUp, Clock, Target, Calendar, WindArrowDown } from 'lucide-react';

export default function HomePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSessions: 0,
        totalMinutes: 0,
        weeklySessions: 0,
        weeklyMinutes: 0,
    });

    useEffect(() => {
        const checkUser = async () => {
            try {
                // 检查是否有 token
                if (!tokenManager.isAuthenticated()) {
                    router.push('/login');
                    return;
                }

                // 获取当前用户信息
                const userResponse = await api.user.getCurrentUser();
                if (userResponse.error || !userResponse.data) {
                    console.error('Error getting user:', userResponse.error);
                    tokenManager.clearToken();
                    router.push('/login');
                    return;
                }

                setUser(userResponse.data);

                // 检查是否有活跃的训练会话
                const activeSessionResponse = await api.session.getActiveSession();
                if (activeSessionResponse.data?.id) {
                    router.push('/training');
                    return;
                }

                // 加载统计数据
                await loadStats();
            } catch (error) {
                console.error('Error checking user:', error);
                tokenManager.clearToken();
                router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkUser();
    }, [router]);

    const loadStats = async () => {
        try {
            const statsResponse = await api.user.getUserStats();
            if (statsResponse.error || !statsResponse.data) {
                console.error('Error loading stats:', statsResponse.error);
                return;
            }

            const data = statsResponse.data;
            setStats({
                totalSessions: data.total_sessions || 0,
                totalMinutes: data.total_minutes || 0,
                weeklySessions: data.weekly_sessions || 0,
                weeklyMinutes: data.weekly_minutes || 0,
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleLogout = async () => {
        try {
            api.user.logout();
            router.push('/login');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">加载中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* 顶部欢迎区域 */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-lg mx-auto px-6 py-6">
                    <h1 className="text-2xl font-bold text-gray-900">欢迎回来</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {user?.username || user?.email?.split('@')[0] || '用户'}，准备好开启新的训练了吗？
                    </p>
                </div>
            </div>

            {/* 统计卡片区域 */}
            <div className="max-w-lg mx-auto px-6 py-6">
                <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.totalSessions}</div>
                            <div className="text-xs text-gray-500 mt-0.5">总次数</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-2">
                                <Clock className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.totalMinutes}</div>
                            <div className="text-xs text-gray-500 mt-0.5">总时长(分)</div>
                        </div>
                    </div>
                    {/* 本周训练 */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                                <Calendar className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.weeklySessions}</div>
                            <div className="text-xs text-gray-500 mt-0.5">本周训练(次)</div>
                        </div>
                    </div>
                </div>

                {/* 主按钮 - 开始训练 */}
                <div className="flex items-center justify-center mb-8">
                    <button
                        onClick={() => router.push('/training')}
                        className="group relative w-56 h-56 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 active:scale-95 transition-all duration-300 ease-out flex items-center justify-center"
                        aria-label="开始训练"
                    >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mb-3">
                                <TrendingUp className="w-8 h-8 text-emerald-500" />
                            </div>
                            <span className="text-2xl font-bold text-gray-900">开始训练</span>
                        </div>
                    </button>
                </div>

                {/* 底部统计卡片 */}
                {/* {
                    !stats.hasLastSession && <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">上次训练</div>
                                    <div className="text-lg font-bold text-gray-900">{`没有记录，开启新的训练吧！`}</div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                    <WindArrowDown className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                } */}
                {/* {stats.hasLastSession && <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs text-gray-500 mb-1">上次训练</div>
                                <div className="text-lg font-bold text-gray-900">{stats.lastSessionTime}</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs text-gray-500 mb-1">上次目标达成率</div>
                                <div className="text-lg font-bold text-gray-900">{stats.lastSessionAchieved}</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center">
                                <span className="text-lg">%</span>
                            </div>
                        </div>
                    </div>
                </div>} */}
            </div>
        </div>
    );
}
