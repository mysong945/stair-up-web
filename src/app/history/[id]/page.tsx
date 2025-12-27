'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, tokenManager } from '@/lib/apiService';
import type { User, TrainingSession, LapStats } from '@/lib/apiService';


interface LapRecord extends LapStats {
  formatted_cost_time: string;
  formatted_created_time: string;
}

interface SessionStats {
  total_laps: number;
  total_floors_climbed: number;
  total_time_seconds: number;
  average_time_per_lap: number;
  fastest_lap_time: number;
  slowest_lap_time: number;
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [lapRecords, setLapRecords] = useState<LapRecord[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
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

  // 获取会话详情和lap记录
  const fetchSessionDetails = async (forceUpdate: boolean = false) => {
    if (!forceUpdate) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      // 获取会话详情
      const sessionResponse = await api.session.getSessionById(sessionId, forceUpdate);
      if (sessionResponse.error || !sessionResponse.data) {
        throw new Error(sessionResponse.error || '会话不存在或无权访问');
      }

      setSession(sessionResponse.data);

      // 获取lap统计
      const lapsResponse = await api.lap.getLapStats(sessionId, forceUpdate);
      if (lapsResponse.error) {
        console.error('Error loading laps:', lapsResponse.error);
      }

      const lapsData = lapsResponse.data || [];
      const processedLaps: LapRecord[] = lapsData.map((lap: LapStats) => {
        const lapTimeSeconds = lap.lap_time_seconds;
        const minutes = Math.floor(lapTimeSeconds / 60);
        const seconds = Math.floor(lapTimeSeconds % 60);
        return {
          ...lap,
          lap_time_seconds: lapTimeSeconds,
          formatted_cost_time: `${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`,
          formatted_created_time: formatDateTime(lap.lap_finish_time),
        };
      });

      setLapRecords(processedLaps);

      if (processedLaps.length > 0 && sessionResponse.data) {
        const total_laps = processedLaps.length;
        const total_time_seconds = processedLaps.reduce(
          (sum, lap) => sum + lap.lap_time_seconds,
          0
        );
        const average_time_per_lap = total_time_seconds / total_laps;
        const fastest_lap_time = Math.min(
          ...processedLaps.map((lap) => lap.lap_time_seconds)
        );
        const slowest_lap_time = Math.max(
          ...processedLaps.map((lap) => lap.lap_time_seconds)
        );
        const total_floors_climbed =
          sessionResponse.data.floors_per_lap * total_laps;

        setStats({
          total_laps,
          total_floors_climbed,
          total_time_seconds,
          average_time_per_lap,
          fastest_lap_time,
          slowest_lap_time,
        });
      }
    } catch (err) {
      setError('获取会话详情失败，请稍后重试');
      console.error('Error fetching session details:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 变更时重新获取数据
  useEffect(() => {
    if (!user || !sessionId) return;
    fetchSessionDetails(false);
  }, [user, sessionId, router]);

  // 格式化日期时间
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 格式化时间（秒转为 mm:ss）
  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds); // 去除小数部分
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };



  // 返回历史记录列表
  const handleBackToList = () => {
    router.push('/history');
  };

  // 刷新数据
  const handleRefresh = async () => {
    await fetchSessionDetails(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <svg className="h-12 w-12 text-blue-600 animate-spin mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">加载会话详情中...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="flex justify-center mb-4">
              <svg className="h-16 w-16 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">获取会话详情失败</h2>
            <p className="text-gray-600 mb-6">{error || '会话不存在或已被删除'}</p>
            <button 
              onClick={handleBackToList}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              返回历史记录列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">StairClimb</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 页面标题和返回按钮 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">训练会话详情</h2>
            <div className="flex items-center gap-2">
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
              <button
                onClick={handleBackToList}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                返回列表
              </button>
            </div>
          </div>

          {/* 会话详情卡片 */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-8 mb-6">
            {/* 会话基本信息 */}
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900">会话信息</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">会话ID</p>
                  <p className="text-base font-medium text-gray-900">{session.id}</p>
                </div>
                {/* <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">创建时间</p>
                  <p className="text-base font-medium text-gray-900">{formatDateTime(session.created_at)}</p>
                </div> */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">开始时间</p>
                  <p className="text-base font-medium text-gray-900">{formatDateTime(session.start_time)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">结束时间</p>
                  <p className="text-base font-medium text-gray-900">{session.end_time ? formatDateTime(session.end_time) : '- 进行中 -'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">目标楼层</p>
                  <p className="text-base font-medium text-gray-900">{session.target_floors} 层</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">每趟楼层数</p>
                  <p className="text-base font-medium text-gray-900">{session.floors_per_lap} 层/趟</p>
                </div>
              </div>
            </div>

            {/* 统计信息 */}
            {stats && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">训练统计</h3>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-6">
                  {/* 目标完成度 */}
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 w-full md:w-1/3">
                    <p className="text-sm text-blue-600 mb-1">目标完成度</p>
                    <p className="text-3xl font-bold text-blue-900 mb-2">{Math.round((stats.total_floors_climbed / session.target_floors) * 100)}%</p>
                    <p className="text-base font-medium text-gray-900">{stats.total_floors_climbed} / {session.target_floors} 层</p>
                  </div>
                  
                  {/* 统计数据 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 flex-1">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-600 mb-1">总趟数</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.total_laps}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <p className="text-sm text-green-600 mb-1">总楼层</p>
                    <p className="text-2xl font-bold text-green-900">{stats.total_floors_climbed}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <p className="text-sm text-purple-600 mb-1">总时间</p>
                    <p className="text-2xl font-bold text-purple-900">{formatTime(stats.total_time_seconds)}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                    <p className="text-sm text-yellow-600 mb-1">平均每趟时间</p>
                    <p className="text-2xl font-bold text-yellow-900">{formatTime(stats.average_time_per_lap)}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <p className="text-sm text-red-600 mb-1">最快趟时间</p>
                    <p className="text-2xl font-bold text-red-900">{formatTime(stats.fastest_lap_time)}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <p className="text-sm text-indigo-600 mb-1">最慢趟时间</p>
                    <p className="text-2xl font-bold text-indigo-900">{formatTime(stats.slowest_lap_time)}</p>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Lap记录列表 */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">训练趟数记录</h3>

            {/* 空数据状态 */}
            {lapRecords.length === 0 ? (
              <div className="text-center py-12">
                <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h4 className="text-lg font-medium text-gray-900 mb-2">暂无趟数记录</h4>
                <p className="text-gray-500">该训练会话还没有记录任何趟数</p>
              </div>
            ) : (
              /* Lap记录列表 */
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        趟数
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用时
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        上报时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lapRecords.map((lap) => (
                      <tr key={lap.lap_number} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          第 {lap.lap_number} 趟
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lap.formatted_cost_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lap.formatted_created_time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
