import api from '../api/axios';
import type { RegisterRequest, LoginRequest, AuthResponse, User } from '../types/auth';

export const authService = {
    // Регистрация
    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/register', data);
        return response.data;
    },

    // Вход
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/login', data);
        return response.data;
    },

    // Получить текущего пользователя
    getMe: async (): Promise<User> => {
        const response = await api.get<User>('/auth/me');
        return response.data;
    },

    // Выход
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Проверка авторизации
    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('token');
    },

    // Получить токен
    getToken: (): string | null => {
        return localStorage.getItem('token');
    },

    // Получить пользователя из localStorage
    getUser: (): User | null => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
};
