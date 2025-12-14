import api from '../api/axios';
import type { RegisterRequest, LoginRequest, User } from '../types/auth';

export const authService = {
    // Регистрация
    register: async (data: RegisterRequest): Promise<User> => {
        const response = await api.post<{ user: User }>('/auth/register', data);
        return response.data.user;
    },

    // Вход
    login: async (data: LoginRequest): Promise<User> => {
        const response = await api.post<{ user: User }>('/auth/login', data);
        return response.data.user;
    },

    // Получить текущего пользователя
    getMe: async (): Promise<User> => {
        const response = await api.get<User>('/auth/me');
        return response.data;
    },

    // Выход
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        }
        // Clear any cached user data
        sessionStorage.removeItem('user');
    },

    // Проверка авторизации - теперь нужно проверять через запрос к серверу
    isAuthenticated: async (): Promise<boolean> => {
        try {
            await authService.getMe();
            return true;
        } catch {
            return false;
        }
    },

    // Получить пользователя из sessionStorage (кеш)
    getCachedUser: (): User | null => {
        const userStr = sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Сохранить пользователя в sessionStorage (кеш)
    setCachedUser: (user: User) => {
        sessionStorage.setItem('user', JSON.stringify(user));
    },

    // Очистить кеш пользователя
    clearCachedUser: () => {
        sessionStorage.removeItem('user');
    },
};

