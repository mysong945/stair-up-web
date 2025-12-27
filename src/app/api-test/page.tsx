/**
 * API 测试工具页面
 * 用于测试新的后台 API 接口
 */

'use client';

import { useEffect, useState } from 'react';
import { api, tokenManager } from '@/lib/apiService';

export default function ApiTestPage() {
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const [authState, setAuthState] = useState<{ isAuthenticated: boolean; token: string | null }>({
        isAuthenticated: false,
        token: null,
    });

    // 避免 SSR/CSR 不一致：仅在客户端读取 localStorage 中的 token
    useEffect(() => {
        setAuthState({
            isAuthenticated: tokenManager.isAuthenticated(),
            token: tokenManager.getToken(),
        });
        setHydrated(true);
    }, []);

    const runTest = async (testName: string, testFn: () => Promise<any>) => {
        setLoading(true);
        setResult(`执行测试: ${testName}...\n`);

        try {
            console.log(`开始测试: ${testName}`);
            const response = await testFn();
            
            if (response.error) {
                setResult(prev => prev + `\n❌ 失败:\n错误: ${response.error}\n响应: ${JSON.stringify(response, null, 2)}`);
            } else {
                setResult(prev => prev + `\n✅ 成功:\n${JSON.stringify(response, null, 2)}`);
            }
        } catch (error) {
            console.error('测试异常:', error);
            setResult(prev => prev + `\n❌ 异常: ${error instanceof Error ? error.message : String(error)}\n${error instanceof Error ? error.stack : ''}`);
        } finally {
            setLoading(false);
        }
    };

    const tests = [
        {
            name: '1. 测试登录',
            fn: () => api.user.login({
                email: 'mysong945@qq.com',
                password: 'eytsnj-sjojdishdcs-plil@',
            }),
        },
        {
            name: '2. 获取当前用户',
            fn: () => api.user.getCurrentUser(),
        },
        {
            name: '3. 获取用户统计',
            fn: () => api.user.getUserStats(),
        },
        {
            name: '4. 获取排行榜',
            fn: () => api.user.getRankings({ limit: 10, by: 'total_sessions' }),
        },
        {
            name: '5. 获取活跃会话',
            fn: () => api.session.getActiveSession(),
        },
        {
            name: '6. 获取已完成会话',
            fn: () => api.session.getFinishedSessions(),
        },
        {
            name: '7. 创建训练会话',
            fn: () => api.session.createSession({
                floors_per_lap: 10,
                target_floors: 100,
            }),
        },
        {
            name: '8. 记录一圈 (需先创建会话)',
            fn: async () => {
                const activeSession = await api.session.getActiveSession();
                if (activeSession.data?.id) {
                    return api.session.recordLap(activeSession.data.id);
                }
                return { error: '没有活跃会话，请先创建训练会话' };
            },
        },
        {
            name: '9. 完成训练 (结束活跃会话)',
            fn: async () => {
                const activeSession = await api.session.getActiveSession();
                if (activeSession.data?.id) {
                    return api.session.finishSession(activeSession.data.id);
                }
                return { error: '没有活跃会话，无法完成训练' };
            },
        },
        {
            name: '10. 放弃训练 (取消活跃会话)',
            fn: async () => {
                const activeSession = await api.session.getActiveSession();
                if (activeSession.data?.id) {
                    return api.session.cancelSession(activeSession.data.id);
                }
                return { error: '没有活跃会话，无法放弃训练' };
            },
        },
        {
            name: '11. 获取圈数统计 (需有会话ID)',
            fn: async () => {
                const sessions = await api.session.getFinishedSessions();
                if (sessions.data && sessions.data.length > 0) {
                    return api.lap.getLapStats(sessions.data[0].id);
                }
                return { error: '没有已完成的会话' };
            },
        },
    ];

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">API 测试工具</h1>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-2">⚙️ API 配置</h2>
                    <div className="space-y-2 text-sm">
                        <p className="text-gray-700">
                            后台地址: <code className="bg-white px-2 py-1 rounded">{process.env.NEXT_PUBLIC_API_BASE_URL || '未配置'}</code>
                        </p>
                        <p className="text-gray-700">
                            代理模式: <code className="bg-white px-2 py-1 rounded">
                                {process.env.NEXT_PUBLIC_USE_API_PROXY !== 'false' ? '✅ 已启用（通过 /api/proxy）' : '❌ 已禁用（直接请求）'}
                            </code>
                        </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        💡 代理模式可以绕过 CORS 跨域限制。如果遇到 CORS 错误，请确保代理模式已启用。
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Token 状态</h2>
                    <p className="text-sm text-gray-600 mb-2">
                        当前认证状态: {!hydrated ? '检测中…' : authState.isAuthenticated ? '✅ 已认证' : '❌ 未认证'}
                    </p>
                    {hydrated && authState.token && (
                        <p className="text-xs text-gray-500 break-all mb-4">
                            Token: {authState.token.substring(0, 50)}...
                        </p>
                    )}
                    <button
                        onClick={() => {
                            tokenManager.clearToken();
                            setAuthState({ isAuthenticated: false, token: null });
                            setResult('Token 已清除');
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        清除 Token
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">测试接口</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        💡 提示：按顺序测试。先登录获取 Token，然后测试其他需要认证的接口。
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {tests.map((test) => (
                            <button
                                key={test.name}
                                onClick={() => runTest(test.name, test.fn)}
                                disabled={loading}
                                className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-left text-sm transition-colors"
                            >
                                {test.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">🚀 快速测试流程</h2>
                    <div className="space-y-2 text-sm text-gray-700">
                        <p><strong>完整流程：</strong></p>
                        <p>1️⃣ 点击 "1. 测试登录" 获取 Token</p>
                        <p>2️⃣ 点击 "7. 创建训练会话" 创建一个新会话</p>
                        <p>3️⃣ 点击 "8. 记录一圈" 多次记录圈数</p>
                        <p>4️⃣ 点击 "9. 完成训练" 或 "10. 放弃训练" 结束会话</p>
                        <p>5️⃣ 查看 "6. 获取已完成会话" 和 "11. 获取圈数统计"</p>
                        <p className="text-xs text-gray-500 mt-3">
                            ⚠️ 注意：完成训练和放弃训练都会结束活跃会话，二选一即可
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">测试结果</h2>
                    <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-sm">
                        {result || '等待测试...'}
                    </pre>
                </div>
            </div>
        </div>
    );
}
