import api from '../api/axios';
import type { RegisterRequest, LoginRequest, User } from '../types/auth';

export const authService = {
    register: async (data: RegisterRequest): Promise<User> => {
        const response = await api.post<{ user: User }>('/auth/register', data);
        return response.data.user;
    },

    login: async (data: LoginRequest): Promise<User> => {
        const response = await api.post<{ user: User }>('/auth/login', data);
        return response.data.user;
    },

    getMe: async (): Promise<User> => {
        const response = await api.get<User>('/auth/me');
        return response.data;
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        }
        // Clear any cached user data
        sessionStorage.removeItem('user');
    },

    isAuthenticated: async (): Promise<boolean> => {
        try {
            await authService.getMe();
            return true;
        } catch {
            return false;
        }
    },

    getCachedUser: (): User | null => {
        const userStr = sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    setCachedUser: (user: User) => {
        sessionStorage.setItem('user', JSON.stringify(user));
    },

    clearCachedUser: () => {
        sessionStorage.removeItem('user');
    },
};

