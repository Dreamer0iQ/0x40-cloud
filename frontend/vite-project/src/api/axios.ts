import axios, { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important: send cookies with requests
});

// Интерсептор для обработки ошибок
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Токен истек или невалиден
            sessionStorage.removeItem('user');
            // Редирект на страницу логина можно сделать в компонентах
        }
        return Promise.reject(error);
    }
);

export default api;
