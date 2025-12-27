'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenManager } from '@/lib/apiService';
import type { User, TrainingSession } from '@/lib/apiService';

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // 检查用户认证状态
  useEffect(() => {
    const checkUser = async () => {
      try {
        if (!tokenManager.isAuthenticated()) {
          router.push('/login');
          return;
        }

        const userResponse = await api.user.getCurrentUser();
        if (userResponse.error || !userResponse.data) {
          tokenManager.clearToken();
          router.push('/login');
          return;
        }

        setUser(userResponse.data);
      } catch (error) {
        console.error('Error checking user:', error);
        tokenManager.clearToken();
        router.push('/login');
      }
    };

    checkUser();
  }, [router]);

  // 获取用户的训练会话
  const fetchSessions = async (forceUpdate: boolean = false) => {
    setError(null);
    if (!forceUpdate) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await api.session.getFinishedSessions(forceUpdate);

      if (response.error) {
        throw new Error(response.error);
      }

      // 设置会话数据
      setSessions(response.data || []);
    } catch (err) {
      setError('获取历史记录失败，请稍后重试');
      console.error('Error fetching sessions:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchSessions(false);
  }, [user]);

  // 格式化日期时间
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  // 处理会话项点击
  const handleSessionClick = (sessionId: string) => {
    router.push(`/history/${sessionId}`);
  };

  // 返回上一页
  const handleBackClick = () => {
    router.push('/');
  };

  // 刷新数据
  const handleRefresh = async () => {
    await fetchSessions(true);
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">加载记录中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">获取记录失败</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="min-w-[120px] min-h-[48px] px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-200 font-medium"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">训练记录</h1>
              <p className="mt-1 text-sm text-gray-500">查看您的历史训练数据</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="刷新数据"
            >
              <svg
                className={`w-6 h-6 text-gray-600 transition-transform ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-lg mx-auto px-6 py-6">
        {/* 空数据状态 */}
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">没有训练记录</h3>
            <p className="text-gray-500 mb-6 text-sm">点击"训练"页面的开始按钮来创建新记录</p>
          </div>
        ) : (
          /* 历史记录标题 */
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-4">历史记录</h2>

            {/* 会话列表 */}
            <div className="space-y-3">
              {sessions.map((session, index) => {
                const durationInSeconds = session.end_time && session.start_time
                  ? new Date(session.end_time).getTime() / 1000 - new Date(session.start_time).getTime() / 1000
                  : 0;
                // 计算训练时长  只显示分钟和秒数
                const minutes = Math.floor(durationInSeconds / 60);
                const seconds = Math.floor(durationInSeconds % 60);
                const durationStr = `${minutes.toString().padStart(2, ' ')}:${seconds.toString().padStart(2, '0')}`;

                const titleStr = `${String(session.floors_per_lap).padEnd(2, ' ')}层/趟 目标${String(session.target_floors).padStart(3, ' ')}`;
                return (
                  <div
                    key={session.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer"
                    onClick={() => handleSessionClick(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                          {/* <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg> */}
                          {`${index+1}`}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900 truncate">
                              {titleStr}
                            </h3>
                          </div>

                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth="2" />
                            </svg>
                            <span>{formatDateTime(session.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-3 flex items-center">
                        <div className="flex items-center text-blue-600 bg-blue-50 rounded-full px-3 py-1">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium">{durationStr}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}