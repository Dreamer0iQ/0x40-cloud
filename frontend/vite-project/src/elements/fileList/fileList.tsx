import { useEffect, useState } from 'react';
import type { FileMetadata } from '../../types/file';
import { fileService } from '../../services/fileService';
import styles from './fileList.module.scss';

interface FileListProps {
  refreshTrigger?: number;
}

export default function FileList({ refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const userFiles = await fileService.getUserFiles();
      setFiles(userFiles);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [refreshTrigger]);

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

  if (files.length === 0) {
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
      {/* <div className={styles.header}>
        <h2>My Files</h2>
        <span className={styles.count}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div> */}

      <div className={styles.table}>
        {/* <div className={styles.tableHeader}>
          <div className={styles.colName}>Name</div>
          <div className={styles.colSize}>Size</div>
          <div className={styles.colType}>Type</div>
          <div className={styles.colDate}>Date</div>
          <div className={styles.colActions}>Actions</div>
        </div> */}
      </div>
    </div>
  );
}
