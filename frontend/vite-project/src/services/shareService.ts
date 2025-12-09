import { api } from '../api/axios';

// Define types based on backend models
export interface SharedFile {
    id: number;
    created_at: string;
    updated_at: string;
    token: string;
    file_id: string;
    user_id: number;
    downloads: number;
    limit?: number;
    expires_at?: string;
    file?: {
        id: string; // uuid
        filename: string;
        original_name: string;
        size: number;
        mime_type: string;
    };
}

export interface CreateShareRequest {
    limit?: number;
    expires_at?: string;
}

export const shareService = {
    // Public methods
    getSharedFile: async (token: string): Promise<SharedFile> => {
        const response = await api.get<SharedFile>(`/public/share/${token}`);
        return response.data;
    },

    downloadSharedFile: (token: string) => {
        // Return the direct URL for download
        const baseURL = api.defaults.baseURL || '';
        return `${baseURL}/public/share/${token}/download`;
    },

    downloadSharedFileBlob: async (token: string): Promise<Blob> => {
        const response = await api.get(`/public/share/${token}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },

    // Protected methods
    createShare: async (fileId: string, data: CreateShareRequest): Promise<SharedFile> => {
        const response = await api.post<SharedFile>(`/files/${fileId}/share`, data);
        return response.data;
    },

    listShares: async (): Promise<SharedFile[]> => {
        const response = await api.get<SharedFile[]>('/shares');
        return response.data;
    },

    revokeShare: async (token: string): Promise<void> => {
        await api.delete(`/shares/${token}`);
    },
};
