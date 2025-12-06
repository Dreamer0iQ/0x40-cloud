import { useEffect, useState } from 'react';
import type { FileMetadata } from '../../types/file';
import { fileService } from '../../services/fileService';
import styles from './recommendations.module.scss';
import FileContextMenu from '../fileContextMenu/fileContextMenu';
import FilePreview from '../filePreview/filePreview';

interface RecommendationsProps {
    title?: string;
    refreshTrigger?: number;
    limit?: number; // Количество файлов для отображения
    type?: 'recent' | 'suggested' | 'images'; // Тип: недавние, рекомендованные или изображения
}

export default function Recommendations({ title = "Recent files", refreshTrigger, limit = 5, type = 'recent' }: RecommendationsProps) {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMenuFileId, setActiveMenuFileId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | undefined>();
    const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
    const [newFileName, setNewFileName] = useState('');
    const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

    useEffect(() => {
        loadRecentFiles();
    }, [refreshTrigger, limit, type]); // Перезагружаем при изменении refreshTrigger, limit или type

    const loadRecentFiles = async () => {
        try {
            setLoading(true);
            // Выбираем метод в зависимости от типа
            let files: FileMetadata[] = [];
            if (type === 'suggested') {
                files = await fileService.getSuggestedFiles(limit);
            } else if (type === 'images') {
                files = await fileService.getImages(limit);
            } else {
                files = await fileService.getRecentFiles(limit);
            }
            setFiles(files);
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFileExtension = (filename: string): string => {
        const ext = filename.split('.').pop();
        return ext ? ext.toUpperCase() : 'FILE';
    };

    const getTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return '1d ago';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const handleDownload = async (file: FileMetadata) => {
        try {
            await fileService.downloadFile(file.id, file.original_name);
        } catch (error) {
            console.error('Failed to download file:', error);
        }
        handleMenuClose();
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

    const handleMenuOpen = (e: React.MouseEvent, fileId: string) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom + 5 });
        setActiveMenuFileId(fileId);
    };

    const handleMenuClose = () => {
        setActiveMenuFileId(null);
        setMenuPosition(undefined);
    };

    const handleRename = () => {
        if (activeMenuFileId) {
            const file = files.find(f => f.id === activeMenuFileId);
            if (file) {
                setNewFileName(file.original_name);
                setRenamingFileId(activeMenuFileId);
            }
        }
        handleMenuClose();
    };

    const handleDelete = async () => {
        if (activeMenuFileId) {
            if (confirm('Are you sure you want to delete this file?')) {
                try {
                    await fileService.deleteFile(activeMenuFileId);
                    await loadRecentFiles();
                } catch (error) {
                    console.error('Failed to delete file:', error);
                    alert('Failed to delete file');
                }
            }
        }
        handleMenuClose();
    };

    const handleRenameSubmit = async (fileId: string) => {
        if (!newFileName.trim()) {
            setRenamingFileId(null);
            return;
        }

        try {
            await fileService.renameFile(fileId, newFileName.trim());
            console.log('✅ File renamed successfully');
            setRenamingFileId(null);
            await loadRecentFiles(); // Обновляем список
        } catch (error) {
            console.error('Failed to rename file:', error);
            alert('Failed to rename file');
            setRenamingFileId(null);
        }
    };

    const handleRenameCancel = () => {
        setRenamingFileId(null);
        setNewFileName('');
    };

    const getFileIcon = (extension: string) => {
        const ext = extension.toUpperCase();

        switch (ext) {
            case 'DOCX':
            case 'DOC':
                return (
                    <div className={styles.iconWrapper}>
                        <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className={styles.fileExtension}>{ext}</span>
                    </div>
                );
            case 'XLS':
            case 'XLSX':
                return (
                    <div className={styles.iconWrapper}>
                        <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className={styles.fileExtension}>{ext}</span>
                    </div>
                );
            case 'PDF':
                return (
                    <div className={styles.iconWrapper}>
                        <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className={styles.fileExtension}>{ext}</span>
                    </div>
                );
            default:
                return (
                    <div className={styles.iconWrapper}>
                        <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="#808080" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className={styles.fileExtension}>{ext}</span>
                    </div>
                );
        }
    };

    if (files.length === 0) {
        return (
            <div className={styles.fileList} style={{ width: '80%' }}>
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
        <div className={styles.recommendations}>
            <div className={styles.header}>
                <h3>{title}</h3>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading...</div>
            ) : (
                <div className={styles.filesList}>
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className={styles.fileCard}
                        >
                            <div
                                className={`${styles.fileIconContainer} ${activeMenuFileId === file.id ? styles.menuOpen : ''}`}
                            >
                                <div onClick={() => handlePreview(file)} style={{ cursor: 'pointer' }}>
                                    {getFileIcon(getFileExtension(file.original_name))}
                                </div>
                                <button
                                    className={styles.moreButton}
                                    onClick={(e) => handleMenuOpen(e, file.id)}
                                    aria-label="More options"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="5" r="2" fill="currentColor" />
                                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                                        <circle cx="12" cy="19" r="2" fill="currentColor" />
                                    </svg>
                                </button>
                            </div>
                            <div className={styles.fileInfo}>
                                <div className={styles.iconSmall}>
                                    <svg width="16" height="16" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M60 10L90 30L80 60L60 80L40 60L30 30L60 10Z" stroke="#3B82F6" strokeWidth="3" fill="none" />
                                    </svg>
                                </div>
                                <div className={styles.fileDetails}>
                                    {renamingFileId === file.id ? (
                                        <input
                                            type="text"
                                            className={styles.renameInput}
                                            value={newFileName}
                                            onChange={(e) => setNewFileName(e.target.value)}
                                            onBlur={() => handleRenameSubmit(file.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRenameSubmit(file.id);
                                                if (e.key === 'Escape') handleRenameCancel();
                                            }}
                                            autoFocus
                                        />
                                    ) : (
                                        <div className={styles.fileName}>{file.original_name.slice(0, 30)}{file.original_name.length > 30 ? '...' : ''}</div>
                                    )}
                                    <div className={styles.fileTime}>{getTimeAgo(file.created_at)}</div>
                                </div>
                            </div>

                            <FileContextMenu
                                isOpen={activeMenuFileId === file.id}
                                onClose={handleMenuClose}
                                onRename={handleRename}
                                onDelete={handleDelete}
                                onDownload={() => handleDownload(file)}
                                position={menuPosition}
                            />
                        </div>
                    ))}
                </div>
            )}
            {previewFile && (
                <FilePreview
                    file={previewFile}
                    onClose={() => setPreviewFile(null)}
                />
            )}
        </div>
    );
}