'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { sessionManager } from '@/lib/sessionManager';
import type { Database } from '@/types/supabase';

type TrainingSessionRow = Database['public']['Tables']['training_sessions']['Row'];
type LapStatsRow = Database['public']['Views']['lap_stats_view']['Row'];

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
  const [session, setSession] = useState<TrainingSessionRow | null>(null);
  const [lapStats, setLapStats] = useState<LapStatsRow[]>([]);
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

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const currentUser = data.user;

        if (!currentUser) {
          router.push('/login');
          return;
        }

        if (cancelled) return;

        setUser(currentUser);

        const activeSession = await sessionManager.getActiveSession(
          currentUser
        );
        if (cancelled) return;

        if (activeSession) {
          setSession(activeSession);
        }

        const { data: historySessionsRaw, error: historyError } = await supabase
          .from('training_sessions')
          .select('floors_per_lap,target_floors')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!cancelled && !historyError && historySessionsRaw) {
          const historySessions =
            historySessionsRaw as Pick<
              TrainingSessionRow,
              'floors_per_lap' | 'target_floors'
            >[];
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

    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession) {
        setUser(null);
        router.push('/login');
      } else {
        setUser(authSession.user);
      }
    });

    const subscription = data.subscription;

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
        const { data, error: queryError } = await supabase
          .from('lap_stats_view')
          .select('*')
          .eq('session_id', sessionId)
          .order('lap_number', { ascending: true });

        if (queryError) {
          console.error('Error loading lap stats', queryError);
          return;
        }

        setLapStats(data ?? []);
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

      const nowIso = new Date().toISOString();

      try {
        const { data, error: insertError } = await (supabase
          .from('training_sessions') as any)
          .insert({
            user_id: user.id,
            start_time: nowIso,
            floors_per_lap: floorsPerLap,
            target_floors: targetFloors,
            status: 'active',
          } satisfies Database['public']['Tables']['training_sessions']['Insert'])
          .select('*')
          .single();

        if (insertError) {
          const activeSession = await sessionManager.getActiveSession(user);
          if (activeSession) {
            setSession(activeSession);
            await loadLapStats(activeSession.id);
            return;
          }
          throw insertError;
        }

        setSession(data);
        setFloorsPerLapInput('');
        setTargetFloorsInput('');
        await loadLapStats(data.id);
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
      const { error: insertError } = await (supabase
        .from('lap_records') as any)
        .insert({
          session_id: session.id,
        } satisfies Database['public']['Tables']['lap_records']['Insert']);

      if (insertError) {
        throw insertError;
      }

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

    setIsFinishing(true);
    setError(null);

    const endIso = new Date().toISOString();

    try {
      const { data, error: updateError } = await (supabase
        .from('training_sessions') as any)
        .update({
          status: 'finished',
          end_time: endIso,
        } satisfies Database['public']['Tables']['training_sessions']['Update'])
        .eq('id', session.id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      setSession(data);
      await loadLapStats(data.id);
      router.push(`/history/${data.id}`);
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

    const endIso = new Date().toISOString();

    try {
      const { data, error: updateError } = await (supabase
        .from('training_sessions') as any)
        .update({
          status: 'abandoned',
          end_time: endIso,
        } satisfies Database['public']['Tables']['training_sessions']['Update'])
        .eq('id', session.id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      setSession(data);
      await loadLapStats(data.id);
      router.push(`/`);
    } catch (err) {
      console.error('Error finishing training session', err);
      setError('取消训练失败，请稍后重试');
    } finally {
      setIsFinishing(false);
    }
  }, [session, loadLapStats, router]);

  const totalLaps = lapStats.length;
  const completedFloors = session ? totalLaps * session.floors_per_lap : 0;
  const completionRate = useMemo(() => {
    if (!session || session.target_floors <= 0) return 0;
    const rate = (completedFloors / session.target_floors) * 100;
    return Math.max(0, Math.round(rate));
  }, [session, completedFloors]);

  const canOperate =
    !!session && session.status === 'active' && !isCreatingLap && !isFinishing;

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
          <div className="space-y-6">
            <div className="grid grid-cols-3 md:grid-cols-1 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium mb-1">
                  已用时间
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatDuration(elapsedSeconds)}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium mb-1">
                  已完成楼层
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {completedFloors} 层
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600 font-medium mb-1">
                  完成进度
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {completionRate}%
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-8">
              <button
                onClick={handleCompleteLap}
                disabled={!canOperate}
                className="items-center px-8 py-4 text-md font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreatingLap && (
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                完成本趟
              </button>
              <button
                onClick={handleFinishTraining}
                disabled={
                  !session ||
                  session.status !== 'active' ||
                  isFinishing
                }
                className="items-center px-8 py-4 text-md font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isFinishing && (
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                完成训练
              </button>

            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">目标总楼层数</p>
                <p className="text-lg font-semibold text-gray-900">
                  {session.target_floors} 层
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">每趟楼层数</p>
                <p className="text-lg font-semibold text-gray-900">
                  {session.floors_per_lap} 层/趟
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">已完成趟数</p>
                <p className="text-lg font-semibold text-gray-900">
                  第 {totalLaps} 趟
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">目标达成度</p>
                <p className="text-sm text-gray-700 font-medium">
                  {completedFloors} / {session.target_floors} 层
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${Math.min(100, completionRate)}%` }}
                ></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {session.status === 'finished' && (
                <p className="text-sm text-gray-600">
                  本次训练已完成，可以返回首页或查看历史记录。
                </p>
              )}
            </div>
            {/* 取消训练返回主页，需要确认 */}
            <div className="grid grid-cols-1 md:grid-cols-1">
              <button
                type="button"
                onClick={handleCancelTraining}
                className="items-center px-8 py-4 text-md font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                取消训练
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                趟数记录
              </h3>
              {lapStats.length === 0 ? (
                <p className="text-sm text-gray-500">
                  还没有任何趟数记录，完成第一趟后会显示在这里。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          趟数
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          完成时间
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          本趟用时
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lapStats.map((lap) => (
                        <tr key={lap.lap_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            第 {lap.lap_number} 趟
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(
                              lap.lap_finish_time
                            ).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
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
