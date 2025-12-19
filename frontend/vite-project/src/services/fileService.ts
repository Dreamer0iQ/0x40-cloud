import api from '../api/axios';
import type { FileUploadResponse, FileListResponse, FileMetadata, StorageStats } from '../types/file';
import { get, set, clear } from 'idb-keyval';

export const fileService = {
  getStorageStats: async (): Promise<StorageStats> => {
    const response = await api.get<StorageStats>('/files/storage');
    return response.data;
  },

  uploadFile: async (
    file: File,
    onProgress?: (progress: number) => void,
    virtualPath?: string,
    folderName?: string
  ): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    if (virtualPath) {
      formData.append('virtual_path', virtualPath);
    }
    if (folderName) {
      formData.append('folder_name', folderName);
    }

    const response = await api.post<FileUploadResponse>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  uploadFiles: async (
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void,
    virtualPath?: string,
    folderName?: string
  ): Promise<FileUploadResponse[]> => {
    const uploadPromises = files.map((file, index) =>
      fileService.uploadFile(file, (progress) => {
        onProgress?.(index, progress);
      }, virtualPath, folderName)
    );

    return Promise.all(uploadPromises);
  },

  uploadFolder: async (
    files: File[],
    folderName: string,
    onProgress?: (fileIndex: number, progress: number) => void,
    parentPath?: string
  ): Promise<FileUploadResponse[]> => {
    console.log(`📦 Starting upload of folder "${folderName}" with ${files.length} files`);

    const uploadPromises = files.map((file, index) => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');

      const fileName = pathParts.pop();

      let virtualPath = '/';
      if (parentPath && parentPath !== '/') {
        const prefix = parentPath.endsWith('/') ? parentPath : parentPath + '/';
        virtualPath = prefix + (pathParts.length > 0 ? pathParts.join('/') + '/' : '');
      } else {
        virtualPath = pathParts.length > 0 ? '/' + pathParts.join('/') + '/' : '/';
      }

      console.log(`  📄 File ${index + 1}/${files.length}: ${fileName} -> ${virtualPath}`);

      return fileService.uploadFile(
        file,
        (progress) => {
          onProgress?.(index, progress);
        },
        virtualPath,
        folderName
      );
    });

    return Promise.all(uploadPromises);
  },

  // Получить список файлов пользователя
  getUserFiles: async (): Promise<FileMetadata[]> => {
    const response = await api.get<FileListResponse>('/files');
    return response.data.files || [];
  },

  getRecentFiles: async (limit: number = 4): Promise<FileMetadata[]> => {
    const response = await api.get<FileListResponse>(`/files/recent?limit=${limit}`);
    return response.data.files || [];
  },

  // рекомендованные файлы (на основе активности)
  getSuggestedFiles: async (limit: number = 4): Promise<FileMetadata[]> => {
    const response = await api.get<FileListResponse>(`/files/suggested?limit=${limit}`);
    return response.data.files || [];
  },

  getFilesByPath: async (path: string = '/'): Promise<FileMetadata[]> => {
    const response = await api.get<FileListResponse>(`/files/by-path`, {
      params: { path }
    });
    return response.data.files || [];
  },

  searchFiles: async (query: string, limit: number = 20): Promise<FileMetadata[]> => {
    if (!query.trim()) return [];
    const response = await api.get<FileListResponse>(`/files/search`, {
      params: { q: query, limit }
    });
    return response.data.files || [];
  },

  downloadFile: async (fileId: string, filename: string): Promise<void> => {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadFolder: async (virtualPath: string, folderName: string): Promise<void> => {
    const response = await api.get(`/files/download-folder`, {
      params: { path: virtualPath },
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${folderName}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Получить файл для предпросмотра (Blob)
  previewFile: async (fileId: string): Promise<Blob> => {
    try {
      const cachedBlob = await get(fileId);
      if (cachedBlob) {
        return cachedBlob;
      }
    } catch (err) {
      console.warn('Failed to read from cache:', err);
    }

    const response = await api.get(`/files/${fileId}/download?preview=true`, {
      responseType: 'blob',
    });

    const blob = response.data;

    set(fileId, blob).catch(err => console.warn('Failed to save to cache:', err));

    return blob;
  },

  // Очистить кэш предпросмотра
  clearPreviewCache: async () => {
    await clear();
  },

  // Удалить файл
  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/files/${fileId}`);
  },

  // Удалить папку
  deleteFolder: async (path: string): Promise<void> => {
    await api.delete(`/files/folder`, { params: { path } });
  },

  // Переименовать файл
  renameFile: async (fileId: string, newName: string): Promise<void> => {
    await api.patch(`/files/${fileId}/rename`, { new_name: newName });
  },

  // Переключить статус избранного
  toggleStarred: async (fileId: string): Promise<{ is_starred: boolean }> => {
    const response = await api.post(`/files/${fileId}/star`);
    return response.data;
  },

  // Переключить статус избранного для папки
  toggleStarredFolder: async (path: string): Promise<{ is_starred: boolean }> => {
    const response = await api.post(`/files/folder/star`, { path });
    return response.data;
  },

  // Получить избранные файлы
  getStarredFiles: async (): Promise<FileMetadata[]> => {
    const response = await api.get<FileListResponse>('/files/starred');
    return response.data.files || [];
  },

  calculateSHA256: async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },

  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },

  getDeletedFiles: async (): Promise<FileMetadata[]> => {
    const response = await api.get<FileListResponse>('/files/trash');
    return response.data.files || [];
  },

  restoreFile: async (fileId: string): Promise<void> => {
    await api.post(`/files/${fileId}/restore`);
  },

  deleteFilePermanently: async (fileId: string): Promise<void> => {
    await api.delete(`/files/${fileId}/permanent`);
  },

  getImages: async (limit: number = 20): Promise<FileMetadata[]> => {
    const response = await api.get<FileListResponse>(`/files/images?limit=${limit}`);
    return response.data.files || [];
  },


  moveFile: async (fileId: string, newPath: string): Promise<void> => {
    await api.patch(`/files/${fileId}/move`, { new_path: newPath });
  },

  createFolder: async (path: string, name: string): Promise<FileMetadata> => {
    const response = await api.post('/files/folder', { path, name });
    return response.data.folder;
  },
};
