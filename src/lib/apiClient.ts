/**
 * API 客户端 - 替代 Supabase
 * 统一处理请求、认证、错误
 */

// ==================== 配置 ====================
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.81.199:7080';
const API_VERSION = '/api/v1';
const TOKEN_KEY = 'auth_token';

// ==================== 类型定义 ====================
interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    message?: string;
}

interface RequestOptions extends RequestInit {
    skipAuth?: boolean; // 跳过认证（如登录、注册接口）
}

// ==================== Token 管理 ====================
export const tokenManager = {
    /**
     * 保存 token 到 localStorage
     */
    setToken(token: string) {
        if (typeof window !== 'undefined') {
            localStorage.setItem(TOKEN_KEY, token);
        }
    },

    /**
     * 获取 token
     */
    getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(TOKEN_KEY);
        }
        return null;
    },

    /**
     * 清除 token
     */
    clearToken() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
        }
    },

    /**
     * 检查是否已认证
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    }
};

// ==================== API 客户端 ====================
class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * 动态设置 API 基础地址
     */
    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    /**
     * 获取当前 API 基础地址
     */
    getBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * 构建完整 URL
     */
    private buildUrl(endpoint: string): string {
        // 直接请求后台 API
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${this.baseUrl}${API_VERSION}${path}`;
    }

    /**
     * 构建请求头
     */
    private buildHeaders(skipAuth: boolean = false): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // 添加认证 token
        if (!skipAuth) {
            const token = tokenManager.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    /**
     * 统一请求处理
     */
    private async request<T = any>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const { skipAuth = false, ...fetchOptions } = options;

        try {
            const url = this.buildUrl(endpoint);
            const headers = this.buildHeaders(skipAuth);

            console.log('🚀 API 请求:', {
                url,
                method: fetchOptions.method || 'GET',
                headers,
                body: fetchOptions.body,
            });

            const response = await fetch(url, {
                ...fetchOptions,
                headers: {
                    ...headers,
                    ...fetchOptions.headers,
                },
            });

            console.log('📡 API 响应:', {
                url,
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
            });

            // 尝试解析响应
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.warn('⚠️ 非 JSON 响应:', text);
                data = { message: text };
            }

            // 处理 401 未授权（token 过期）
            // 注意：跳过登录、注册等不需要认证的接口
            if (response.status === 401 && !skipAuth) {
                tokenManager.clearToken();
                // 延迟跳转，让错误信息能够显示
                setTimeout(() => {
                    if (typeof window !== 'undefined') {
                        window.location.href = '/login';
                    }
                }, 1000);
                return {
                    error: '认证失败，即将跳转到登录页...',
                    data: null,
                };
            }

            // 处理 HTTP 错误
            if (!response.ok) {
                return {
                    error: data.error || data.message || `HTTP ${response.status}: ${response.statusText}`,
                    data: null,
                };
            }

            return {
                data,
                error: undefined,
            };
        } catch (error) {
            console.error('❌ API 请求失败:', {
                endpoint,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });

            return {
                error: error instanceof Error ? error.message : '网络请求失败，请检查网络连接',
                data: null,
            };
        }
    }

    /**
     * GET 请求
     */
    async get<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'GET',
        });
    }

    /**
     * POST 请求
     */
    async post<T = any>(
        endpoint: string,
        body?: any,
        options?: RequestOptions
    ): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    /**
     * PUT 请求
     */
    async put<T = any>(
        endpoint: string,
        body?: any,
        options?: RequestOptions
    ): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    /**
     * DELETE 请求
     */
    async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'DELETE',
        });
    }

    /**
     * PATCH 请求
     */
    async patch<T = any>(
        endpoint: string,
        body?: any,
        options?: RequestOptions
    ): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    }
}

// ==================== 导出实例 ====================
export const apiClient = new ApiClient(API_BASE_URL);

// ==================== 辅助函数 ====================
/**
 * 处理 API 响应错误
 */
export function handleApiError(error: string | undefined, defaultMessage: string = '操作失败'): string {
    return error || defaultMessage;
}
