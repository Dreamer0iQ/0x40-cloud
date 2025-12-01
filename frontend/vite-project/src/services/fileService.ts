import api from '../api/axios';
import type { FileUploadResponse, FileListResponse, FileMetadata } from '../types/file';

export const fileService = {
  // Загрузить файл
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

  // Загрузить несколько файлов
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

  // Загрузить папку (с сохранением структуры)
  uploadFolder: async (
    files: File[],
    folderName: string,
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<FileUploadResponse[]> => {
    console.log(`📦 Starting upload of folder "${folderName}" with ${files.length} files`);
    
    const uploadPromises = files.map((file, index) => {
      // Извлекаем относительный путь из webkitRelativePath
      // Пример: "MyFolder/subfolder/file.txt"
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      // Убираем имя файла, оставляем только путь к папке
      // Например, из ["MyFolder", "subfolder", "file.txt"] получаем ["MyFolder", "subfolder"]
      const fileName = pathParts.pop();
      
      // Создаем виртуальный путь
      // Например: "/MyFolder/subfolder/"
      const virtualPath = pathParts.length > 0 ? '/' + pathParts.join('/') + '/' : '/';
      
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

  // Получить недавние файлы
  getRecentFiles: async (limit: number = 4): Promise<FileMetadata[]> => {
    const response = await api.get<FileListResponse>(`/files/recent?limit=${limit}`);
    return response.data.files || [];
  },

  // Получить рекомендованные файлы (на основе активности)
  getSuggestedFiles: async (limit: number = 4): Promise<FileMetadata[]> => {
    const response = await api.get<FileListResponse>(`/files/suggested?limit=${limit}`);
    return response.data.files || [];
  },

  // Скачать файл
  downloadFile: async (fileId: string, filename: string): Promise<void> => {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });

    // Создаем ссылку для скачивания
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Удалить файл
  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/files/${fileId}`);
  },

  // Переименовать файл
  renameFile: async (fileId: string, newName: string): Promise<void> => {
    await api.patch(`/files/${fileId}/rename`, { new_name: newName });
  },

  // Получить SHA256 хеш файла на клиенте (для проверки)
  calculateSHA256: async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },

  // Форматирование размера файла
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },
};
