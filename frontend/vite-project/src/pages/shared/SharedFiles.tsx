import { useEffect, useState } from 'react';
import { shareService } from '../../services/shareService';
import type { SharedFile } from '../../services/shareService';
import ToolBar from '../../elements/toolBar/toolbar';
import SearchBar from '../../elements/searchBar/searchbar';
import styles from './sharedFiles.module.scss';
import FullPageLoader from '../../elements/FullPageLoader/FullPageLoader';

export default function SharedFiles() {
    const [shares, setShares] = useState<SharedFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadShares();
    }, []);

    const loadShares = async () => {
        try {
            setLoading(true);
            const data = await shareService.listShares();
            setShares(data);
        } catch (error) {
            console.error('Failed to load shared files:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (token: string) => {
        if (!confirm('Are you sure you want to revoke this share link? It will stop working immediately.')) return;

        try {
            await shareService.revokeShare(token);
            setShares(shares.filter(s => s.token !== token));
        } catch (error) {
            console.error('Failed to revoke share:', error);
            alert('Failed to revoke share.');
        }
    };

    const copyLink = (token: string) => {
        const url = `${window.location.origin}/share/${token}`;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    return (
        <div className={styles.wrapper}>
            <ToolBar>
                <SearchBar />
                <div className={styles.container} style={{ marginTop: '60px' }}>
                    <h1 className={styles.title}>Shared Files</h1>

                    {loading ? (
                        <FullPageLoader />
                    ) : shares.length === 0 ? (
                        <div className={styles.empty}>
                            <p>You haven't shared any files yet.</p>
                        </div>
                    ) : (
                        <div className={styles.list}>
                            <div className={styles.header}>
                                <span>File Name</span>
                                <span>Downloads</span>
                                <span>Created</span>
                                <span>Actions</span>
                            </div>
                            {shares.map(share => (
                                <div key={share.id} className={styles.item}>
                                    <div className={styles.name}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                            <polyline points="13 2 13 9 20 9" />
                                        </svg>
                                        {share.file?.original_name || 'Unknown'}
                                    </div>
                                    <div>{share.downloads} {share.limit ? `/ ${share.limit}` : ''}</div>
                                    <div>{new Date(share.created_at).toLocaleDateString()}</div>
                                    <div className={styles.actions}>
                                        <button onClick={() => copyLink(share.token)} className={styles.linkBtn}>
                                            Copy Link
                                        </button>
                                        <button onClick={() => handleRevoke(share.token)} className={styles.revokeBtn}>
                                            Revoke
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ToolBar>
        </div>
    );
}
