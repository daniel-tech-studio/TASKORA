import { request, resetCsrf } from './client';
import type { Task, TaskInput, TaskPage, TaskPatch, TaskQuery, TaskStats, User } from '../types';

export interface MeResponse {
  user: User;
  session: { id: string; createdAt: string; expiresAt: string };
}

export const authApi = {
  async register(input: { name: string; email: string; password: string; timeZone?: string }): Promise<User> {
    const user = await request<User>('POST', '/auth/register', { body: input, skipRefresh: true });
    resetCsrf(); // le jeton CSRF est lié à la session : il change avec elle
    return user;
  },
  async login(input: { email: string; password: string }): Promise<User> {
    const user = await request<User>('POST', '/auth/login', { body: input, skipRefresh: true });
    resetCsrf();
    return user;
  },
  async logout(): Promise<void> {
    try {
      await request<void>('POST', '/auth/logout', { skipRefresh: true });
    } finally {
      resetCsrf();
    }
  },
  me(): Promise<MeResponse> {
    return request<MeResponse>('GET', '/auth/me');
  },
};

export const usersApi = {
  updateProfile(input: { name?: string; email?: string; currentPassword?: string }): Promise<User> {
    return request<User>('PATCH', '/users/me', { body: input });
  },
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    return request<void>('PATCH', '/users/me/password', { body: input });
  },
};

export const tasksApi = {
  list(query: TaskQuery, signal?: AbortSignal): Promise<TaskPage> {
    return request<TaskPage>('GET', '/tasks', { query: { ...query }, signal });
  },
  stats(signal?: AbortSignal): Promise<TaskStats> {
    return request<TaskStats>('GET', '/tasks/stats', { signal });
  },
  get(id: string, signal?: AbortSignal): Promise<Task> {
    return request<Task>('GET', `/tasks/${encodeURIComponent(id)}`, { signal });
  },
  create(input: TaskInput): Promise<Task> {
    return request<Task>('POST', '/tasks', { body: input });
  },
  update(id: string, patch: TaskPatch): Promise<Task> {
    return request<Task>('PATCH', `/tasks/${encodeURIComponent(id)}`, { body: patch });
  },
  remove(id: string): Promise<void> {
    return request<void>('DELETE', `/tasks/${encodeURIComponent(id)}`);
  },
};
