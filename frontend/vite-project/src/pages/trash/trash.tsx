import { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import styles from './trash.module.scss';
import ToolBar from '../../elements/toolBar/toolbar';
import SearchBar from '../../elements/searchBar/searchbar';
import ManageFiles from '../../elements/manageFiles/manageFiles';
import FileList from '../../elements/fileList/fileList';

export default function Trash() {
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        loadUser();
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const loadUser = async () => {
        try {
            await authService.getMe();
        } catch (error) {
            console.error('Failed to load user:', error);
            authService.logout();
            window.location.href = '/login';
        } finally {
            setLoading(false);
        }
    };

    const handleFileUploaded = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    return (
        <div className={styles.storageWrapper}>
            <ToolBar>
                <SearchBar></SearchBar>
                <div className={styles.container}>
                    <h2 style={{ marginBottom: '20px' }}>Trash</h2>
                    <FileList
                        refreshTrigger={refreshTrigger}
                        mode="trash"
                    />
                </div>
                <ManageFiles onFileUploaded={handleFileUploaded} />
            </ToolBar>
        </div>
    );
}
