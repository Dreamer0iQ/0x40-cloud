import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FileMetadata } from '../../types/file';
import { fileService } from '../../services/fileService';
import { normalizePath } from '../../utils/pathUtils';
import styles from './fileList.module.scss';

interface FileListProps {
  refreshTrigger?: number;
  currentPath?: string;
}

export default function FileList({ refreshTrigger, currentPath = '/' }: FileListProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const sanitizedPath = normalizePath(currentPath);
      const pathFiles = await fileService.getFilesByPath(sanitizedPath);
      
      // Разделяем на файлы и папки
      const uniqueFolders = new Set<string>();
      const filesOnly: FileMetadata[] = [];
      
      pathFiles.forEach(file => {
        if (file.mime_type === 'inode/directory') {
          uniqueFolders.add(file.original_name);
        } else {
          filesOnly.push(file);
        }
      });
      
      setFolders(Array.from(uniqueFolders).sort());
      setFiles(filesOnly);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [refreshTrigger, currentPath]);

  const handleDownload = async (file: FileMetadata) => {
    try {
      await fileService.downloadFile(file.id, file.original_name);
    } catch (err) {
      console.error('Failed to download file:', err);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (file: FileMetadata) => {
    if (!confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
      return;
    }

    try {
      await fileService.deleteFile(file.id);
      await loadFiles();
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert('Failed to delete file');
    }
  };

  const handleFolderClick = (folderName: string) => {
    // Переходим в папку, добавляя её к текущему пути
    const newPath = normalizePath(
      currentPath === '/' 
        ? `/${folderName}` 
        : `${currentPath}${folderName}`
    );
    navigate(`/storage?path=${encodeURIComponent(newPath)}`);
  };

  if (loading) {
    return (
      <div className={styles.fileList}>
        <div className={styles.loading}>Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.fileList}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (files.length === 0 && folders.length === 0) {
    return (
      <div className={styles.fileList}>
        <div className={styles.empty}>
          <svg width="80" height="80" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M33.75 7.5H30H17.5C14.7386 7.5 12.5 9.73857 12.5 12.5V47.5C12.5 50.2615 14.7386 52.5 17.5 52.5H42.5C45.2615 52.5 47.5 50.2615 47.5 47.5V21.5625M33.75 7.5L47.5 21.5625M33.75 7.5V19.0625C33.75 20.4432 34.8693 21.5625 36.25 21.5625H47.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>No files uploaded yet</p>
          <span>Upload your first file using the buttons on the right</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fileList}>
      <div className={styles.table}>
        {/* Папки */}
        {folders.map((folderName) => (
          <div 
            key={folderName} 
            className={styles.fileRow}
            onClick={() => handleFolderClick(folderName)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.fileInfo}>
              <div className={styles.fileIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.fileName}>
                <span className={styles.name}>{folderName}</span>
                <span className={styles.meta}>Folder</span>
              </div>
            </div>
          </div>
        ))}
        
        {/* Файлы */}
        {files.map((file) => (
          <div key={file.id} className={styles.fileRow}>
            <div className={styles.fileInfo}>
              <div className={styles.fileIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9M13 2L20 9M13 2V9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.fileName}>
                <span className={styles.name}>{file.original_name}</span>
                <span className={styles.meta}>
                  {fileService.formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className={styles.fileActions}>
              <button onClick={() => handleDownload(file)} title="Download">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button onClick={() => handleDelete(file)} title="Delete">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
