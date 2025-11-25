import { useRef, useState } from 'react';
import styles from './manageFiles.module.scss';
import { fileService } from '../../services/fileService';

interface ManageFilesProps {
    onFileUploaded?: () => void;
}

export default function ManageFiles({ onFileUploaded }: ManageFilesProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const fileArray = Array.from(files);
            
            if (fileArray.length === 1) {
                // Загрузка одного файла
                await fileService.uploadFile(fileArray[0], (progress) => {
                    setUploadProgress(progress);
                });
            } else {
                // Загрузка нескольких файлов
                let completedFiles = 0;
                await fileService.uploadFiles(fileArray, (_fileIndex, progress) => {
                    if (progress === 100) {
                        completedFiles++;
                    }
                    const totalProgress = Math.round((completedFiles / fileArray.length) * 100);
                    setUploadProgress(totalProgress);
                });
            }

            // Уведомляем родительский компонент об успешной загрузке
            onFileUploaded?.();
            
            // Сбрасываем прогресс
            setTimeout(() => {
                setUploadProgress(0);
                setIsUploading(false);
            }, 1000);
        } catch (error) {
            console.error('File upload error:', error);
            alert('Ошибка при загрузке файла');
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleUploadFilesClick = () => {
        fileInputRef.current?.click();
    };

    const handleUploadFolderClick = () => {
        folderInputRef.current?.click();
    };

    return (
        <section className={styles.manageFiles}>
            <h3 className={styles.title}>Manage files</h3>
            
            {/* Скрытые input элементы */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files)}
            />
            <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-ignore - webkitdirectory is not in the types but supported by browsers
                webkitdirectory="true"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files)}
            />

            {/* Прогресс загрузки */}
            {isUploading && (
                <div className={styles.uploadProgress}>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill} 
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                    <span className={styles.progressText}>{uploadProgress}%</span>
                </div>
            )}

            <button 
                className={styles.menuItem} 
                onClick={handleUploadFilesClick}
                disabled={isUploading}
            >
                <svg width="24" height="24" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M33.75 7.5H30H17.5C14.7386 7.5 12.5 9.73857 12.5 12.5V47.5C12.5 50.2615 14.7386 52.5 17.5 52.5H18.75M33.75 7.5L47.5 21.5625M33.75 7.5V19.0625C33.75 20.4432 34.8693 21.5625 36.25 21.5625H47.5M47.5 21.5625V24.375V30V47.5C47.5 50.2615 45.2615 52.5 42.5 52.5H41.25" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M30 52.5V32.5M30 32.5L36.25 38.75M30 32.5L23.75 38.75" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Upload files</span>
            </button>

            <button 
                className={styles.menuItem}
                onClick={handleUploadFolderClick}
                disabled={isUploading}
            >
                <svg width="24" height="24" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.5 32.5H37.5M30 25V40M30.1568 15.1568L29.8432 14.8432C28.9785 13.9784 28.546 13.546 28.0415 13.2368C27.594 12.9627 27.1063 12.7606 26.5963 12.6382C26.0208 12.5 25.4092 12.5 24.1863 12.5H15.5C12.6997 12.5 11.2996 12.5 10.2301 13.045C9.28923 13.5243 8.52432 14.2892 8.04497 15.2301C7.5 16.2996 7.5 17.6997 7.5 20.5V39.5C7.5 42.3003 7.5 43.7005 8.04497 44.77C8.52432 45.7108 9.28923 46.4757 10.2301 46.955C11.2996 47.5 12.6997 47.5 15.5 47.5H44.5C47.3002 47.5 48.7005 47.5 49.77 46.955C50.7108 46.4757 51.4757 45.7108 51.955 44.77C52.5 43.7005 52.5 42.3003 52.5 39.5V25.5C52.5 22.6997 52.5 21.2996 51.955 20.2301C51.4757 19.2892 50.7108 18.5243 49.77 18.045C48.7005 17.5 47.3002 17.5 44.5 17.5H35.8137C34.5907 17.5 33.9792 17.5 33.4037 17.3618C32.8937 17.2394 32.406 17.0373 31.9585 16.7632C31.454 16.454 31.0215 16.0216 30.1568 15.1568Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Upload folder</span>
            </button>

            <button className={styles.menuItem} disabled>
                <svg width="24" height="24" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.5 32.5H37.5M30 25V40M30.1568 15.1568L29.8432 14.8432C28.9785 13.9784 28.546 13.546 28.0415 13.2368C27.594 12.9627 27.1063 12.7606 26.5963 12.6382C26.0208 12.5 25.4092 12.5 24.1863 12.5H15.5C12.6997 12.5 11.2996 12.5 10.2301 13.045C9.28923 13.5243 8.52432 14.2892 8.04497 15.2301C7.5 16.2996 7.5 17.6997 7.5 20.5V39.5C7.5 42.3003 7.5 43.7005 8.04497 44.77C8.52432 45.7108 9.28923 46.4757 10.2301 46.955C11.2996 47.5 12.6997 47.5 15.5 47.5H44.5C47.3002 47.5 48.7005 47.5 49.77 46.955C50.7108 46.4757 51.4757 45.7108 51.955 44.77C52.5 43.7005 52.5 42.3003 52.5 39.5V25.5C52.5 22.6997 52.5 21.2996 51.955 20.2301C51.4757 19.2892 50.7108 18.5243 49.77 18.045C48.7005 17.5 47.3002 17.5 44.5 17.5H35.8137C34.5907 17.5 33.9792 17.5 33.4037 17.3618C32.8937 17.2394 32.406 17.0373 31.9585 16.7632C31.454 16.454 31.0215 16.0216 30.1568 15.1568Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>New folder</span>
            </button>

            <button className={styles.menuItem} disabled>
                <svg width="24" height="24" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.5 32.5H37.5M37.5 32.5L32.5 27.5M37.5 32.5L32.5 37.5M30.1568 15.1568L29.8432 14.8432C28.9785 13.9784 28.546 13.546 28.0415 13.2368C27.594 12.9627 27.1063 12.7606 26.5963 12.6382C26.0208 12.5 25.4092 12.5 24.1863 12.5H15.5C12.6997 12.5 11.2996 12.5 10.2301 13.045C9.28923 13.5243 8.52432 14.2892 8.04497 15.2301C7.5 16.2996 7.5 17.6997 7.5 20.5V39.5C7.5 42.3003 7.5 43.7005 8.04497 44.77C8.52432 45.7108 9.28923 46.4757 10.2301 46.955C11.2996 47.5 12.6997 47.5 15.5 47.5H44.5C47.3002 47.5 48.7005 47.5 49.77 46.955C50.7108 46.4757 51.4757 45.7108 51.955 44.77C52.5 43.7005 52.5 42.3003 52.5 39.5V25.5C52.5 22.6997 52.5 21.2996 51.955 20.2301C51.4757 19.2892 50.7108 18.5243 49.77 18.045C48.7005 17.5 47.3002 17.5 44.5 17.5H35.8137C34.5907 17.5 33.9792 17.5 33.4037 17.3618C32.8937 17.2394 32.406 17.0373 31.9585 16.7632C31.454 16.454 31.0215 16.0216 30.1568 15.1568Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>New shared folder</span>
            </button>
        </section>
    )
}