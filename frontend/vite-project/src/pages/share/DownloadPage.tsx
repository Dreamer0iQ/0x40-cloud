import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shareService } from '../../services/shareService';
import type { SharedFile } from '../../services/shareService';
import Logo from '../../elements/Logo/Logo';
import styles from './download.module.scss';
import FullPageLoader from '../../elements/FullPageLoader/FullPageLoader';

export default function DownloadPage() {
    const { token } = useParams<{ token: string }>();
    const [share, setShare] = useState<SharedFile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            loadShare(token);
        }
    }, [token]);

    const loadShare = async (token: string) => {
        try {
            setLoading(true);
            const data = await shareService.getSharedFile(token);
            setShare(data);
        } catch (err: any) {
            console.error('Failed to load shared file:', err);
            setError(err.response?.data?.error || 'Failed to load file info. Link might be expired.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!token || !share?.file) return;

        // For large files (>500MB), open in new tab to avoid memory issues
        if (share.file.size > 500 * 1024 * 1024) {
            const url = shareService.downloadSharedFile(token);
            window.open(url, '_blank');
            return;
        }

        try {
            // For smaller files, download as blob to handle errors gracefully
            const blob = await shareService.downloadSharedFileBlob(token);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', share.file.original_name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Download failed:', err);
            /* try to parse blob error */
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    alert(json.error || 'Download failed');
                } catch {
                    alert('Download failed');
                }
            } else {
                alert('Download failed');
            }
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return <FullPageLoader />;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Logo width={40} height={40} />
            </header>

            <main className={styles.content}>
                <div className={styles.card}>
                    {error ? (
                        <div className={styles.error}>
                            <h3>Error</h3>
                            <p>{error}</p>
                        </div>
                    ) : share && share.file ? (
                        <>
                            <div className={styles.iconWrapper}>
                                {/* Generic File Icon */}
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                    <polyline points="13 2 13 9 20 9"></polyline>
                                </svg>
                            </div>

                            <div className={styles.fileInfo}>
                                <h1>{share.file.original_name}</h1>
                                <p>{formatSize(share.file.size)}</p>
                            </div>

                            <button className={styles.downloadButton} onClick={handleDownload}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Download
                            </button>
                        </>
                    ) : (
                        <div className={styles.error}>
                            <p>File not found</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
