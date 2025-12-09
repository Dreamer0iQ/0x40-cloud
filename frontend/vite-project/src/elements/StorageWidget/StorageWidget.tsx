import { useEffect, useState } from 'react';
import styles from './StorageWidget.module.scss';
import { fileService } from '../../services/fileService';
import type { StorageStats } from '../../types/file';


export default function StorageWidget() {
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await fileService.getStorageStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load storage stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatSize = (bytes: number) => fileService.formatFileSize(bytes);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3>Storage</h3>
                </div>
                <div className={styles.loading}></div>
            </div>
        );
    }

    if (!stats) return null;

    const total = stats.total_used;

    const limit = stats.limit || 10 * 1024 * 1024 * 1024; // Fallback to 10GB if zero

    const segments = [
        { key: 'images', label: 'Images', size: stats.image_size, color: '#0060FF' },
        { key: 'videos', label: 'Videos', size: stats.video_size, color: '#a18cd1' },
        { key: 'docs', label: 'Documents', size: stats.doc_size, color: '#34C759' },
        { key: 'other', label: 'Other', size: stats.other_size, color: '#808080' },
    ];

    const activeSegments = segments.filter(s => s.size > 0);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Storage</h3>
                <div className={styles.usageText}>
                    <span>{formatSize(total)}</span> of {formatSize(limit)} used
                </div>
            </div>

            <div className={styles.barContainer}>
                {activeSegments.map(segment => (
                    <div
                        key={segment.key}
                        className={styles.segment}
                        style={{
                            width: `${(segment.size / limit) * 100}%`,
                            backgroundColor: segment.color
                        }}
                    />
                ))}
            </div>

            <div className={styles.legend}>
                {activeSegments.map(segment => (
                    <div key={segment.key} className={styles.legendItem}>
                        <div className={styles.dot} style={{ backgroundColor: segment.color }} />
                        <span>{segment.label}</span>
                        <span className={styles.size}>{formatSize(segment.size)}</span>
                    </div>
                ))}
            </div>

            {stats.trash_size > 0 && (
                <div className={styles.trashAlert}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>Trash</span>
                    <span className={styles.trashSize}>{formatSize(stats.trash_size)}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}> • Clean up to free space</span>
                </div>
            )}

            {(stats.physical_total > 0) && (
                <div className={styles.trashAlert} style={{ marginTop: 0, borderTop: 'none', paddingTop: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <span>Server Disk</span>
                    <span className={styles.trashSize}>{formatSize(stats.physical_total - stats.physical_free)} / {formatSize(stats.physical_total)}</span>
                </div>
            )}
        </div>
    );
}
