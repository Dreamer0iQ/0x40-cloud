import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import type { User } from '../../types/auth';
import { normalizePath } from '../../utils/pathUtils';
import styles from './storage.module.scss';
import ToolBar from '../../elements/toolBar/toolbar';
import SearchBar from '../../elements/searchBar/searchbar';
import ManageFiles from '../../elements/manageFiles/manageFiles';
import Breadcrumbs from '../../elements/breadcrumbs/breadcrumbs';
import FileList from '../../elements/fileList/fileList';

interface StorageProps {
    onLogout: () => void;
}

export default function Storage({ onLogout }: StorageProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [searchParams] = useSearchParams();

    const currentPath = normalizePath(searchParams.get('path') || '/');

    useEffect(() => {
        loadUser();
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const loadUser = async () => {
        try {
            const userData = await authService.getMe();
            setUser(userData);
        } catch (error) {
            console.error('Failed to load user:', error);
            authService.logout();
            onLogout();
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
                <div className={styles.container} style={{ "marginTop": "60px" }}>
                    {/* Breadcrumbs для навигации по папкам */}
                    <Breadcrumbs currentPath={currentPath} basePath="/storage" />

                    {/* Список всех файлов и папок в текущем пути */}
                    <FileList
                        refreshTrigger={refreshTrigger}
                        currentPath={currentPath}
                    />
                </div>
                <ManageFiles onFileUploaded={handleFileUploaded} />
            </ToolBar>
        </div>
    );
}
