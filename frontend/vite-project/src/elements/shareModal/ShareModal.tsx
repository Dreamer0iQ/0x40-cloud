import { useState, useEffect } from 'react';
import { shareService } from '../../services/shareService';
import styles from './shareModal.module.scss';
import type { FileMetadata } from '../../types/file';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: FileMetadata | null;
}

export default function ShareModal({ isOpen, onClose, file }: ShareModalProps) {
    const [loading, setLoading] = useState(false);
    const [downloadLimit, setDownloadLimit] = useState<string>('');
    const [expiresIn, setExpiresIn] = useState<string>(''); // in hours
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setShareUrl(null);
            setDownloadLimit('');
            setExpiresIn('');
        }
    }, [isOpen]);

    if (!isOpen || !file) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const limit = downloadLimit ? parseInt(downloadLimit) : undefined;

            let expiresAt: string | undefined = undefined;
            if (expiresIn) {
                const date = new Date();
                date.setHours(date.getHours() + parseInt(expiresIn));
                expiresAt = date.toISOString();
            }

            const response = await shareService.createShare(file.id, { limit, expires_at: expiresAt });
            const url = `${window.location.origin}/share/${response.token}`;
            setShareUrl(url);
        } catch (error) {
            console.error('Failed to share file:', error);
            alert('Failed to create share link');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            alert('Link copied!');
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Share "{file.original_name}"</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {!shareUrl ? (
                    <>
                        <div className={styles.content}>
                            <div className={styles.field}>
                                <label>Download Limit (optional)</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 5"
                                    value={downloadLimit}
                                    onChange={e => setDownloadLimit(e.target.value)}
                                />
                            </div>

                            <div className={styles.field}>
                                <label>Expires In (hours, optional)</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 24"
                                    value={expiresIn}
                                    onChange={e => setExpiresIn(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.cancelButton} onClick={onClose}>Cancel</button>
                            <button
                                className={styles.submitButton}
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Link'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className={styles.result}>
                        <p>Link created successfully!</p>
                        <div className={styles.linkGroup}>
                            <input readOnly value={shareUrl} />
                            <button onClick={copyToClipboard}>Copy</button>
                        </div>
                        <div className={styles.actions}>
                            <button className={styles.submitButton} onClick={onClose}>Done</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
