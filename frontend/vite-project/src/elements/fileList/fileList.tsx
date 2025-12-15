import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FileMetadata } from '../../types/file';
import { fileService } from '../../services/fileService';
import { normalizePath } from '../../utils/pathUtils';
import styles from './fileList.module.scss';
import FilePreview from '../filePreview/filePreview';
import { useToast } from '../../contexts/toastContext';
import DataPulseLoader from '../Logo/DataPulseLoader';
import ShareModal from '../shareModal/ShareModal';

interface FileListProps {
  refreshTrigger?: number;
  currentPath?: string;
  mode?: 'storage' | 'favourites' | 'trash';
  previewFileId?: string | null;
}

export default function FileList({ refreshTrigger, currentPath = '/', mode = 'storage', previewFileId }: FileListProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [folders, setFolders] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [shareFile, setShareFile] = useState<FileMetadata | null>(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      let pathFiles: FileMetadata[] = [];

      if (mode === 'favourites') {
        pathFiles = await fileService.getStarredFiles();
      } else if (mode === 'trash') {
        pathFiles = await fileService.getDeletedFiles();
      } else {
        const sanitizedPath = normalizePath(currentPath);
        pathFiles = await fileService.getFilesByPath(sanitizedPath);
      }

      // Разделяем на файлы и папки
      const uniqueFoldersMap = new Map<string, FileMetadata>();
      const filesOnly: FileMetadata[] = [];

      pathFiles.forEach(file => {
        if (file.mime_type === 'inode/directory') {
          // Use original_name as key to dedup if needed, though they should be unique by ID
          if (!uniqueFoldersMap.has(file.original_name)) {
            uniqueFoldersMap.set(file.original_name, file);
          }
        } else {
          filesOnly.push(file);
        }
      });

      setFolders(Array.from(uniqueFoldersMap.values()).sort((a, b) => a.original_name.localeCompare(b.original_name)));
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

  // Auto-open preview from URL parameter (e.g., from search)
  useEffect(() => {
    if (previewFileId && files.length > 0) {
      const file = files.find(f => f.id === previewFileId);
      if (file) {
        setPreviewFile(file);
      }
    }
  }, [previewFileId, files]);

  const handleDownload = async (file: FileMetadata) => {
    try {
      await fileService.downloadFile(file.id, file.original_name);
    } catch (err) {
      console.error('Failed to download file:', err);
      alert('Failed to download file');
    }
  };

  const handleShare = (file: FileMetadata) => {
    setShareFile(file);
  };

  const handleDelete = async (file: FileMetadata) => {
    const isTrash = mode === 'trash';
    const message = isTrash
      ? `Are you sure you want to PERMANENTLY delete "${file.original_name}"? This action cannot be undone.`
      : `Are you sure you want to delete "${file.original_name}"?`;

    if (!confirm(message)) {
      return;
    }

    try {
      if (isTrash) {
        await fileService.deleteFilePermanently(file.id);
      } else {
        if (file.mime_type === 'inode/directory') {
          const folderPath = normalizePath(
            currentPath === '/'
              ? `/${file.original_name}/`
              : `${currentPath}${file.original_name}/`
          );
          await fileService.deleteFolder(folderPath);
        } else {
          await fileService.deleteFile(file.id);
        }
      }
      await loadFiles();
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert('Failed to delete file');
    }
  };

  const handleRestore = async (file: FileMetadata) => {
    try {
      await fileService.restoreFile(file.id);
      await loadFiles();
    } catch (err) {
      console.error('Failed to restore file:', err);
      alert('Failed to restore file');
    }
  };

  const handleRename = async (file: FileMetadata) => {
    setRenamingFileId(file.id);
    setNewFileName(file.original_name);
  };

  const handleRenameSubmit = async (file: FileMetadata) => {
    if (!newFileName.trim()) {
      alert('File name cannot be empty');
      return;
    }

    try {
      await fileService.renameFile(file.id, newFileName);
      setRenamingFileId(null);
      await loadFiles();
    } catch (err) {
      console.error('Failed to rename file:', err);
      alert('Failed to rename file');
    }
  };

  const handleRenameCancel = () => {
    setRenamingFileId(null);
    setNewFileName('');
  };

  const handleToggleStarred = async (file: FileMetadata, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      let isStarred = false;
      if (file.mime_type === 'inode/directory') {
        const folderPath = normalizePath(
          currentPath === '/'
            ? `/${file.original_name}/`
            : `${currentPath}${file.original_name}/`
        );
        const result = await fileService.toggleStarredFolder(folderPath);
        isStarred = result.is_starred;

        setFolders(prev =>
          prev.map(f =>
            f.original_name === file.original_name ? { ...f, is_starred: isStarred } : f
          )
        );

      } else {
        const result = await fileService.toggleStarred(file.id);
        isStarred = result.is_starred;
        setFiles(prevFiles =>
          prevFiles.map(f =>
            f.id === file.id ? { ...f, is_starred: isStarred } : f
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle starred:', err);
      alert('Failed to update starred status');
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


  const handlePreview = (file: FileMetadata) => {
    // 50 MB limit
    if (file.size > 50 * 1024 * 1024) {
      if (confirm(`File is too large for preview (${fileService.formatFileSize(file.size)}). Download instead?`)) {
        handleDownload(file);
      }
      return;
    }
    setPreviewFile(file);
  };

  const handleDownloadFolder = async (folder: FileMetadata) => {
    try {
      const folderPath = normalizePath(
        currentPath === '/'
          ? `/${folder.original_name}/`
          : `${currentPath}${folder.original_name}/`
      );
      await fileService.downloadFolder(folderPath, folder.original_name);
    } catch (err) {
      console.error('Failed to download folder:', err);
      alert('Failed to download folder');
    }
  };

  const handleDragStart = (e: React.DragEvent, file: FileMetadata) => {
    if (file.mime_type === 'inode/directory') {
      // Prevent dragging folders for now if we don't support it fully
      // or just let it be file move only as requested
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify(file));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: FileMetadata) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const draggedFile: FileMetadata = JSON.parse(data);
      if (draggedFile.id === targetFolder.id) return; // Can't drop on itself (though folder vs file types prevent this mostly)
      if (draggedFile.mime_type === 'inode/directory') return; // Don't allow moving folders into folders yet if complex

      const targetPath = normalizePath(
        currentPath === '/'
          ? `/${targetFolder.original_name}/`
          : `${currentPath}${targetFolder.original_name}/`
      );

      await fileService.moveFile(draggedFile.id, targetPath);
      addToast(`Moved ${draggedFile.original_name} to ${targetFolder.original_name}`, 'success');
      await loadFiles();
    } catch (err) {
      console.error('Failed to move file:', err);
      addToast('Failed to move file', 'error');
    }
  };

  if (loading) {
    return (
      <div className={styles.fileList}>
        <div className={styles.loading}>
          <DataPulseLoader width={60} height={60} />
        </div>
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
            <path d="M33.75 7.5H30H17.5C14.7386 7.5 12.5 9.73857 12.5 12.5V47.5C12.5 50.2615 14.7386 52.5 17.5 52.5H42.5C45.2615 52.5 47.5 50.2615 47.5 47.5V21.5625M33.75 7.5L47.5 21.5625M33.75 7.5V19.0625C33.75 20.4432 34.8693 21.5625 36.25 21.5625H47.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* Файлы и Папки */}

        {folders.map((folder) => (
          <div
            key={folder.original_name}
            className={styles.fileRow}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, folder)}
          >
            <div
              className={styles.fileInfo}
              onClick={() => handleFolderClick(folder.original_name)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`${styles.fileIcon} ${styles.folderIcon}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.fileName}>
                {renamingFileId === folder.original_name ? ( // Virtual folder has no ID, using name for state tracking if needed, or stick to ID if we assigned one in loadFiles?
                  // Wait, loadFiles assigns metadata. If backend sends empty ID, we have problem.
                  // Let's rely on name for now since ID is 0000.
                  <div className={styles.renameInput} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(folder); // This needs to handle folder rename by path
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                      autoFocus
                    />
                    <button onClick={() => handleRenameSubmit(folder)} className={styles.saveBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button onClick={handleRenameCancel} className={styles.cancelBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={styles.name}>{folder.original_name}</span>
                    <span className={styles.meta}>Folder</span>
                  </>
                )}
              </div>
            </div>
            <div className={styles.fileActions}>
              <button onClick={() => handleDownloadFolder(folder)} title="Download Zip">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button onClick={() => handleDelete(folder)} title="Delete">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button onClick={() => handleRename(folder)} title="Rename">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.1022 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.1022 21.5 2.5C21.8978 2.8978 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.1022 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={(e) => handleToggleStarred(folder, e)}
                title={folder.is_starred ? "Remove from favorites" : "Add to favorites"}
                className={folder.is_starred ? styles.starred : ''}
              >
                <svg width="20" height="20" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M30 7.5L35.0892 20.4038C35.559 21.595 35.7938 22.1905 36.1535 22.6927C36.4723 23.1379 36.862 23.5277 37.3073 23.8465C37.8095 24.2061 38.405 24.441 39.5963 24.9108L52.5 30L39.5963 35.0892C38.405 35.559 37.8095 35.7938 37.3073 36.1535C36.862 36.4723 36.4723 36.862 36.1535 37.3073C35.7938 37.8095 35.559 38.405 35.0892 39.5963L30 52.5L24.9108 39.5963C24.441 38.405 24.2061 37.8095 23.8465 37.3073C23.5277 36.862 23.1379 36.4723 22.6927 36.1535C22.1905 35.7938 21.595 35.559 20.4038 35.0892L7.5 30L20.4038 24.9108C21.595 24.441 22.1905 24.2061 22.6927 23.8465C23.1379 23.5277 23.5277 23.1379 23.8465 22.6927C24.2061 22.1905 24.441 21.595 24.9108 20.4038L30 7.5Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Файлы */}
        {files.map((file) => (
          <div
            key={file.id}
            className={styles.fileRow}
            draggable
            onDragStart={(e) => handleDragStart(e, file)}
          >
            <div
              className={styles.fileInfo}
              onClick={() => handlePreview(file)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.fileIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9M13 2L20 9M13 2V9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.fileName}>
                {renamingFileId === file.id ? (
                  <div className={styles.renameInput} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(file);
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                      autoFocus
                    />
                    <button onClick={() => handleRenameSubmit(file)} className={styles.saveBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button onClick={handleRenameCancel} className={styles.cancelBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={styles.name}>{file.original_name}</span>
                    <span className={styles.meta}>
                      {fileService.formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className={styles.fileActions}>
              {mode === 'trash' ? (
                <>
                  <button onClick={() => handleRestore(file)} title="Restore">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 14h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 10c0-4.418-3.582-8-8-8-3.333 0-6.188 2.045-7.355 5.03L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(file)} title="Delete Permanently" className={styles.danger}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6H5H21" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 11L14 15" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 11L10 15" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleDownload(file)} title="Download">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button onClick={() => handleShare(file)} title="Share">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(file)} title="Delete">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button onClick={() => handleRename(file)} title="Rename">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.1022 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.1022 21.5 2.5C21.8978 2.8978 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.1022 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleToggleStarred(file, e)}
                    title={file.is_starred ? "Remove from favorites" : "Add to favorites"}
                    className={file.is_starred ? styles.starred : ''}
                  >
                    <svg width="20" height="20" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M30 7.5L35.0892 20.4038C35.559 21.595 35.7938 22.1905 36.1535 22.6927C36.4723 23.1379 36.862 23.5277 37.3073 23.8465C37.8095 24.2061 38.405 24.441 39.5963 24.9108L52.5 30L39.5963 35.0892C38.405 35.559 37.8095 35.7938 37.3073 36.1535C36.862 36.4723 36.4723 36.862 36.1535 37.3073C35.7938 37.8095 35.559 38.405 35.0892 39.5963L30 52.5L24.9108 39.5963C24.441 38.405 24.2061 37.8095 23.8465 37.3073C23.5277 36.862 23.1379 36.4723 22.6927 36.1535C22.1905 35.7938 21.595 35.559 20.4038 35.0892L7.5 30L20.4038 24.9108C21.595 24.441 22.1905 24.2061 22.6927 23.8465C23.1379 23.5277 23.5277 23.1379 23.8465 22.6927C24.2061 22.1905 24.441 21.595 24.9108 20.4038L30 7.5Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {
        previewFile && (
          <FilePreview
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )
      }
      <ShareModal
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        file={shareFile}
      />
    </div >
  );
}
