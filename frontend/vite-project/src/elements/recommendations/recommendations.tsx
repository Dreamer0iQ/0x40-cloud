import styles from './recommendations.module.scss'

interface FileType {
    filename: string,
    extension: string,
    lastAccess: string
}

interface RecommendationsProps {
    files: FileType[],
    title?: string
}

export default function Recommendations({ files, title = "Suggest from your activity" }: RecommendationsProps) {
    const getFileIcon = (extension: string) => {
        const ext = extension.toUpperCase();
        
        switch(ext) {
            case 'DOCX':
            case 'DOC':
                return (
                    <div className={styles.iconWrapper}>
                        <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={styles.fileExtension}>{ext}</span>
                    </div>
                );
            case 'XLS':
            case 'XLSX':
                return (
                    <div className={styles.iconWrapper}>
                        <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={styles.fileExtension}>{ext}</span>
                    </div>
                );
            case 'PDF':
                return (
                    <div className={styles.iconWrapper}>
                        <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={styles.fileExtension}>{ext}</span>
                    </div>
                );
            default:
                return (
                    <div className={styles.iconWrapper}>
                        <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="#808080" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={styles.fileExtension}>{ext}</span>
                    </div>
                );
        }
    };

    return (
        <div className={styles.recommendations}>
            <div className={styles.header}>
                <h3>{title}</h3>
            </div>
            
            <div className={styles.filesList}>
                {files.map((file, index) => (
                    <div key={index} className={styles.fileCard}>
                        {getFileIcon(file.extension)}
                        <div className={styles.fileInfo}>
                            <div className={styles.iconSmall}>
                                <svg width="16" height="16" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M60 10L90 30L80 60L60 80L40 60L30 30L60 10Z" stroke="#3B82F6" strokeWidth="3" fill="none"/>
                                </svg>
                            </div>
                            <div className={styles.fileDetails}>
                                <div className={styles.fileName}>{file.filename}</div>
                                <div className={styles.fileTime}>{file.lastAccess}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}