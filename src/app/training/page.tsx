'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenManager } from '@/lib/apiService';
import type { User, TrainingSession } from '@/lib/apiService';

interface LapRecord {
  lap_number: number;
  lap_finish_time: string;
  lap_time_seconds: number;
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
}

export default function TrainingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [lapStats, setLapStats] = useState<LapRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [floorsPerLapInput, setFloorsPerLapInput] = useState('');
  const [targetFloorsInput, setTargetFloorsInput] = useState('');
  const [floorsPerLapSuggestions, setFloorsPerLapSuggestions] = useState<
    number[]
  >([]);
  const [targetFloorsSuggestions, setTargetFloorsSuggestions] = useState<
    number[]
  >([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCreatingLap, setIsCreatingLap] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0); // 冷却倒计时（秒）
  const COOLDOWN_DURATION = 60; // 调试用5秒，正式环境改为60秒（1分钟）

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // 检查认证
        if (!tokenManager.isAuthenticated()) {
          router.push('/login');
          return;
        }

        // 获取当前用户
        const userResponse = await api.user.getCurrentUser();
        if (userResponse.error || !userResponse.data) {
          tokenManager.clearToken();
          router.push('/login');
          return;
        }

        if (cancelled) return;

        setUser(userResponse.data);

        // 获取活跃会话
        const activeSessionResponse = await api.session.getActiveSession();
        if (cancelled) return;

        if (activeSessionResponse.data && !activeSessionResponse.error) {
          setSession(activeSessionResponse.data);
        }

        // 获取历史会话以生成建议
        const historyResponse = await api.session.getFinishedSessions();
        if (!cancelled && historyResponse.data && historyResponse.data.length > 0) {
          const historySessions = historyResponse.data;
          const uniqueFloorsPerLap = Array.from(
            new Set(
              historySessions
                .map((s) => s.floors_per_lap)
                .filter((v): v is number => typeof v === 'number' && v > 0)
            )
          )
            .sort((a, b) => a - b)
            .slice(0, 5);

          const uniqueTargetFloors = Array.from(
            new Set(
              historySessions
                .map((s) => s.target_floors)
                .filter((v): v is number => typeof v === 'number' && v > 0)
            )
          )
            .sort((a, b) => a - b)
            .slice(0, 5);

          setFloorsPerLapSuggestions(uniqueFloorsPerLap);
          setTargetFloorsSuggestions(uniqueTargetFloors);
        }
      } catch (e) {
        if (!cancelled) {
          setError('加载训练会话失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!session) {
      setElapsedSeconds(0);
      return;
    }

    const start = new Date(session.start_time).getTime();

    if (session.end_time) {
      const end = new Date(session.end_time).getTime();
      const diff = Math.max(0, Math.floor((end - start) / 1000));
      setElapsedSeconds(diff);
      return;
    }

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSeconds(diff);
    };

    update();

    const timerId = window.setInterval(update, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [session]);

  const loadLapStats = useCallback(
    async (sessionId: string) => {
      try {
        const response = await api.lap.getLapStats(sessionId);
        if (response.error || !response.data) {
          console.error('Error loading lap stats', response.error);
          return;
        }

        // 转换数据格式
        const laps: LapRecord[] = response.data.map((stat) => ({
          lap_number: stat.lap_number,
          lap_finish_time: stat.lap_finish_time,
          lap_time_seconds: stat.lap_time_seconds,
        }));

        setLapStats(laps);
      } catch (e) {
        console.error('Error loading lap stats', e);
      }
    },
    []
  );

  useEffect(() => {
    if (!session) return;
    loadLapStats(session.id);
  }, [session, loadLapStats]);

  const handleCreateSession = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || isCreatingSession) return;

      const floorsPerLap = parseInt(floorsPerLapInput, 10);
      const targetFloors = parseInt(targetFloorsInput, 10);

      if (!Number.isFinite(floorsPerLap) || floorsPerLap <= 0) {
        setError('请输入有效的每趟楼层数');
        return;
      }

      if (!Number.isFinite(targetFloors) || targetFloors <= 0) {
        setError('请输入有效的目标总楼层数');
        return;
      }

      setIsCreatingSession(true);
      setError(null);

      try {
        const response = await api.session.createSession({
          floors_per_lap: floorsPerLap,
          target_floors: targetFloors,
        });

        if (response.error) {
          // 可能已有活跃会话
          const activeSessionResponse = await api.session.getActiveSession();
          if (activeSessionResponse.data) {
            setSession(activeSessionResponse.data);
            await loadLapStats(activeSessionResponse.data.id);
            return;
          }
          throw new Error(response.error);
        }

        if (response.data) {
          setSession(response.data);
          setFloorsPerLapInput('');
          setTargetFloorsInput('');
          await loadLapStats(response.data.id);
        }
      } catch (err) {
        console.error('Error creating training session', err);
        setError('创建训练会话失败，请稍后重试');
      } finally {
        setIsCreatingSession(false);
      }
    },
    [
      user,
      floorsPerLapInput,
      targetFloorsInput,
      isCreatingSession,
      loadLapStats,
    ]
  );

  const handleCompleteLap = useCallback(async () => {
    if (!session || isCreatingLap || isFinishing) return;

    setIsCreatingLap(true);
    setError(null);

    try {
      const response = await api.session.recordLap(session.id);

      if (response.error) {
        throw new Error(response.error);
      }

      // 启动冷却计时
      setCooldownSeconds(COOLDOWN_DURATION);

      await loadLapStats(session.id);
    } catch (err) {
      console.error('Error inserting lap record', err);
      setError('上报本趟数据失败，请稍后重试');
    } finally {
      setIsCreatingLap(false);
    }
  }, [session, isCreatingLap, isFinishing, loadLapStats]);

  const handleFinishTraining = useCallback(async () => {
    if (!session || isFinishing) return;

    // 确认完成训练
    if (!confirm('确定要完成当前训练吗？')) {
      return;
    }

    setIsFinishing(true);
    setError(null);

    try {
      const response = await api.session.finishSession(session.id);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        setSession(response.data);
        await loadLapStats(response.data.id);
        router.push(`/history/${response.data.id}`);
      }
    } catch (err) {
      console.error('Error finishing training session', err);
      setError('完成训练失败，请稍后重试');
    } finally {
      setIsFinishing(false);
    }
  }, [session, isFinishing, loadLapStats, router]);

  const handleCancelTraining = useCallback(async () => {
    if (!session || isFinishing) return;

    // 确认取消训练
    if (!confirm('确定要取消当前训练吗？取消后当前训练数据将被丢弃。')) {
      return;
    }

    setIsFinishing(true);
    setError(null);

    try {
      const response = await api.session.cancelSession(session.id);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        setSession(response.data);
        await loadLapStats(response.data.id);
        router.push(`/`);
      }
    } catch (err) {
      console.error('Error cancelling training session', err);
      setError('取消训练失败，请稍后重试');
    } finally {
      setIsFinishing(false);
    }
  }, [session, isFinishing, loadLapStats, router]);

  const totalLaps = lapStats.length;
  const completedFloors = session ? totalLaps * session.floors_per_lap : 0;
  const completionRate = useMemo(() => {
    if (!session || session.target_floors <= 0) return 0;
    const rate = (completedFloors / session.target_floors) * 100;
    return Math.max(0, Math.round(rate));
  }, [session, completedFloors]);

  const inCooldown = cooldownSeconds > 0;
  const canOperate =
    !!session && session.status === 'active' && !isCreatingLap && !isFinishing && !inCooldown;

  // 冷却计时器
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">加载训练页面中...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">训练中心</h1>
              {session && (
                <p className="mt-1 text-sm text-gray-500">
                  {session.status === 'active' ? '训练进行中...' : '训练已完成'}
                </p>
              )}
            </div>
            {session && (
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${session.status === 'active'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-gray-50 text-gray-700 border border-gray-200'
                }`}>
                {session.status === 'active' ? '进行中' : '已完成'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-lg mx-auto px-6 py-6 space-y-4">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!session && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <form onSubmit={handleCreateSession} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  创建新训练
                </h3>
                <p className="text-sm text-gray-500">
                  设置每趟楼层数和目标总楼层数，开始训练
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    每趟楼层数
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={floorsPerLapInput}
                    onChange={(e) => setFloorsPerLapInput(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如 10"
                  />
                  {floorsPerLapSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {floorsPerLapSuggestions.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFloorsPerLapInput(value.toString())}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${floorsPerLapInput === value.toString()
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95'
                            }`}
                        >
                          {value} 层/趟
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    目标总楼层数
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={targetFloorsInput}
                    onChange={(e) => setTargetFloorsInput(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如 100"
                  />
                  {targetFloorsSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {targetFloorsSuggestions.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTargetFloorsInput(value.toString())}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${targetFloorsInput === value.toString()
                            ? 'bg-green-600 text-white'
                            : 'bg-green-50 text-green-700 hover:bg-green-100 active:scale-95'
                            }`}
                        >
                          {value} 层
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingSession}
                className="w-full min-h-[48px] flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingSession ? '创建中...' : '开始训练'}
              </button>
              {/* 取消训练返回主页 */}
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full min-h-[48px] flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 active:scale-[0.98] transition-all duration-200"
              >
                返回主页
              </button>
            </form>
          </div>
        )}

        {session && (
          <div className="space-y-4">
            {/* 训练时长显示 - 大号显示 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 text-center">
              <p className="text-sm text-blue-600 font-medium mb-2">训练时长</p>
              <p className="text-5xl font-bold text-blue-900">{formatDuration(elapsedSeconds)}</p>
            </div>

            {/* 关键指标 - 两列显示 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.5 1.5H3a1.5 1.5 0 00-1.5 1.5v12a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5V8.5" />
                  </svg>
                  <p className="text-xs text-gray-500 font-medium">累计楼层</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{completedFloors}</p>
                <p className="text-xs text-gray-500 mt-1">/ {session.target_floors} 层</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                  </svg>
                  <p className="text-xs text-gray-500 font-medium">完成趟数</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalLaps}</p>
                <p className="text-xs text-gray-500 mt-1">{session.floors_per_lap} 层/趟</p>
              </div>
            </div>

            {/* 冷却状态提示 */}
            {inCooldown && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 1119.414 6.414 1 1 0 01-1.414-1.414A5.002 5.002 0 005.659 5.109A1 1 0 014 6.664V3a1 1 0 01-1-1zm.008 9a1 1 0 011.992 0A5.002 5.002 0 0114.333 15H11a1 1 0 010-2h5a1 1 0 011 1v5a1 1 0 01-2 0v-3.667A7.002 7.002 0 004.008 11z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-700">冷却中，请稍候...</span>
                </div>
                <p className="text-lg font-bold text-green-900">{cooldownSeconds}s</p>
              </div>
            )}

            {/* 目标达成度进度条 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">目标达成度</p>
                <p className="text-sm font-semibold text-gray-900">{completionRate}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${Math.min(100, completionRate)}%` }}
                ></div>
              </div>
            </div>

            {/* 按钮组 */}
            <div className="space-y-3">
              {/* 完成本趟 - 单独一行 */}
              <button
                onClick={handleCompleteLap}
                disabled={!canOperate}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isCreatingLap ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    计录中...
                  </>
                ) : (
                  '✓ 完成本趟'
                )}
              </button>

              {/* 结束训练和放弃 - 两列 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleFinishTraining}
                  disabled={!session || session.status !== 'active' || isFinishing}
                  className="flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isFinishing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      结束中...
                    </>
                  ) : (
                    '✓ 结束训练'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelTraining}
                  className="flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl text-red-600 border border-red-300 hover:bg-red-50 active:scale-95 transition-all"
                >
                  ✕ 放弃
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                圈次记录
              </h3>
              {lapStats.length === 0 ? (
                <p className="text-sm text-gray-500">
                  还没有任何圈次记录，完成第一圈后会显示在这里。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-0">
                          圈数
                        </th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4">
                          完成时间
                        </th>
                        <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-0">
                          本趟用时
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lapStats.map((lap) => (
                        <tr key={lap.lap_number} className="border-b border-gray-100 hover:bg-blue-50">
                          <td className="py-3 px-0 text-sm font-medium text-gray-900">
                            第 {lap.lap_number} 圈
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 text-center">
                            {new Date(lap.lap_finish_time).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-0 text-sm text-blue-600 text-right font-semibold">
                            {formatDuration(lap.lap_time_seconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
