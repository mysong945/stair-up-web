/**
 * API 服务层 - 封装所有后台 API 调用
 * 基于 Postman collection 定义的接口
 */

import { apiClient, tokenManager } from './apiClient';

// ==================== 类型定义 ====================

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  metadata?: {
    nickname?: string;
    phone?: string;
    [key: string]: any;
  };
}

export interface UserStats {
  total_sessions: number;
  total_time: number;
  total_floors: number;
  this_week_sessions: number;
  last_session?: {
    id: string;
    start_time: string;
    end_time: string;
    floors_achieved: number;
  };
}

export interface RankingUser {
  user_id: string;
  username: string;
  rank: number;
  total_sessions?: number;
  total_floors?: number;
  total_time?: number;
}

// 训练会话相关类型
export interface TrainingSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  floors_per_lap: number;
  target_floors: number;
  status: 'active' | 'finished' | 'abandoned';
  created_at: string;
}

// 圈数统计类型
export interface LapStats {
  session_id: string;
  lap_number: number;
  lap_time: string;
  total_laps: number;
  total_floors: number;
  avg_lap_duration?: number;
}

// ==================== 用户 API ====================
export const userApi = {
  /**
   * 用户注册
   */
  async register(data: { username: string; email: string; password: string }) {
    const response = await apiClient.post<{ token: string; user: User }>(
      '/register',
      data,
      { skipAuth: true }
    );

    // 注册成功后保存 token
    if (response.data?.token) {
      tokenManager.setToken(response.data.token);
    }

    return response;
  },

  /**
   * 用户登录
   */
  async login(data: { username?: string; email: string; password: string }) {
    const response = await apiClient.post<{ token: string; user: User }>(
      '/login',
      data,
      { skipAuth: true }
    );

    // 登录成功后保存 token
    if (response.data?.token) {
      tokenManager.setToken(response.data.token);
    }

    return response;
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser() {
    return apiClient.get<User>('/me');
  },

  /**
   * 获取当前用户统计数据
   */
  async getUserStats() {
    return apiClient.get<UserStats>('/me/stats');
  },

  /**
   * 更新用户信息
   */
  async updateUser(data: { username?: string; metadata?: Record<string, any> }) {
    return apiClient.put<User>('/me', data);
  },

  /**
   * 获取排行榜
   * @param limit 返回数量
   * @param by 排序依据: total_sessions | total_floors | total_time
   * @param forceUpdate 强制更新缓存
   */
  async getRankings(params: { limit?: number; by?: string; force_update?: boolean } = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.by) queryParams.append('by', params.by);
    if (params.force_update !== undefined) 
      queryParams.append('force_update', params.force_update.toString());

    const endpoint = `/rankings${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiClient.get<RankingUser[]>(endpoint);
  },

  /**
   * 登出
   */
  logout() {
    tokenManager.clearToken();
  },
};

// ==================== 训练会话 API ====================
export const sessionApi = {
  /**
   * 获取活跃的训练会话
   */
  async getActiveSession() {
    return apiClient.get<TrainingSession>('/sessions/active');
  },

  /**
   * 获取已完成的训练会话列表
   */
  async getFinishedSessions() {
    return apiClient.get<TrainingSession[]>('/sessions/finished');
  },

  /**
   * 根据 ID 获取训练会话详情
   */
  async getSessionById(sessionId: string) {
    return apiClient.get<TrainingSession>(`/sessions/${sessionId}`);
  },

  /**
   * 创建新的训练会话
   */
  async createSession(data: { floors_per_lap: number; target_floors: number }) {
    return apiClient.post<TrainingSession>('/sessions/', data);
  },

  /**
   * 完成训练会话
   */
  async finishSession(sessionId: string) {
    return apiClient.post<TrainingSession>('/sessions/finish', {
      session_id: sessionId,
    });
  },

  /**
   * 取消/放弃训练会话
   */
  async cancelSession(sessionId: string) {
    return apiClient.post<TrainingSession>('/sessions/cancel', {
      session_id: sessionId,
    });
  },

  /**
   * 记录一圈
   */
  async recordLap(sessionId: string) {
    return apiClient.post<{ id: string; session_id: string; created_at: string }>(
      '/sessions/record',
      { session_id: sessionId }
    );
  },
};

// ==================== 圈数记录 API ====================
export const lapApi = {
  /**
   * 获取会话的圈数记录列表
   */
  async getLapRecords(sessionId: string) {
    return apiClient.get<any[]>(`/lap/${sessionId}`);
  },

  /**
   * 获取会话的圈数统计
   */
  async getLapStats(sessionId: string) {
    return apiClient.get<LapStats[]>(`/lap/stats/${sessionId}`);
  },
};

// ==================== 统一导出 ====================
export { tokenManager } from './apiClient';

export const api = {
  user: userApi,
  session: sessionApi,
  lap: lapApi,
};

export default api;
