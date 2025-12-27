'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenManager } from '@/lib/apiService';
import type { User } from '@/lib/apiService';
import { createPortal } from 'react-dom';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; phone?: string; general?: string }>({});

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!tokenManager.isAuthenticated()) {
          router.push('/login');
          return;
        }

        const userResponse = await api.user.getCurrentUser();
        if (userResponse.error || !userResponse.data) {
          setErrors({ general: '加载用户信息失败，请稍后重试' });
          tokenManager.clearToken();
          router.push('/login');
          return;
        }

        const currentUser = userResponse.data;
        setUser(currentUser);
        setDisplayName(currentUser.metadata?.nickname || currentUser.username || '');
        setPhone(currentUser.metadata?.phone || '');
        setEmail(currentUser.email || '');
      } catch (error) {
        setErrors({ general: '加载用户信息失败，请稍后重试' });
        tokenManager.clearToken();
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const validate = () => {
    const nextErrors: { displayName?: string; phone?: string } = {};

    if (!displayName.trim()) {
      nextErrors.displayName = '显示名称不能为空';
    }

    if (!phone.trim()) {
      nextErrors.phone = '手机号不能为空';
    }

    setErrors((prev) => ({ ...prev, ...nextErrors, general: undefined }));

    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;
    if (!validate()) return;

    setIsSaving(true);
    setErrors({});

    try {
      const response = await api.user.updateUser({
        username: displayName,
        metadata: {
          nickname: displayName,
          phone,
        },
      });

      if (response.error) {
        setErrors({ general: response.error });
        return;
      }

      if (response.data) {
        setUser(response.data);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      }
    } catch (error) {
      setErrors({ general: '保存失败，请稍后重试' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {showSuccess &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
            <div className="bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3">
              <div className="flex-shrink-0 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium">保存成功</span>
            </div>
          </div>,
          document.body
        )}

      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">设置</h1>
          <p className="mt-1 text-sm text-gray-500">管理您的账户信息</p>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-lg mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form className="space-y-6" onSubmit={handleSave}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {errors.general}
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold text-gray-900 mb-2">
                显示名称
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                className={`w-full min-h-[48px] px-4 py-3 border ${errors.displayName ? 'border-red-300' : 'border-gray-200'
                  } rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="您的昵称"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              {errors.displayName && (
                <p className="mt-2 text-sm text-red-600">{errors.displayName}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-">
                手机号
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                className={`w-full min-h-[48px] px-4 py-3 border ${errors.phone ? 'border-red-300' : 'border-gray-200'
                  } rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="您的手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full min-h-[48px] px-4 py-3 border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed"
                value={email}
                disabled
                readOnly
              />
              <p className="mt-2 text-xs text-gray-500">如需修改邮箱，请联系管理员。</p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full min-h-[48px] flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '保存中...' : '保存更改'}
              </button>
            </div>
          </form>

          {/* 退出登录 */}
          <div className="mt-2 pt-3 border-t border-gray-100">
            <button
              onClick={async () => {
                api.user.logout();
                router.push('/login');
              }}
              className="w-full min-h-[48px] flex items-center justify-center px-6 py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 active:scale-[0.98] transition-all duration-200"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
