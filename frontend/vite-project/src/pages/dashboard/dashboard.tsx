import { useEffect, useState, useRef } from 'react';
import { authService } from '../../services/authService';
import type { User } from '../../types/auth';
import styles from './dashboard.module.scss';
import ToolBar from '../../elements/toolBar/toolbar';
import SearchBar from '../../elements/searchBar/searchbar';
import ManageFiles from '../../elements/manageFiles/manageFiles';
import Recommendations from '../../elements/recommendations/recommendations';

interface DashboardProps {
    onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0);
    const manageFilesRef = useRef<any>(null);

    useEffect(() => {
        loadUser();

        document.body.style.overflow = 'hidden';

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
        // Обновляем список файлов после загрузки
        setRefreshTrigger(prev => prev + 1);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (manageFilesRef.current?.handleDroppedFiles) {
                manageFilesRef.current.handleDroppedFiles(e.dataTransfer.files);
            }
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    return (
        <div 
            className={styles.dashboardWrapper}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className={styles.dropOverlay}>
                    <div className={styles.dropMessage}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M20 21H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span>Отпустите файлы для загрузки</span>
                    </div>
                </div>
            )}
            <ToolBar>
                <SearchBar></SearchBar>
                <div className={styles.container} style={{ "marginTop": "60px" }}>
                    {/* Недавние файлы */}
                    <Recommendations
                        title="Recent files"
                        type="recent"
                        refreshTrigger={refreshTrigger}
                        limit={4}
                    />

                    {/* Рекомендованные файлы (на основе активности) */}
                    <Recommendations
                        title="Suggested for you"
                        type="suggested"
                        refreshTrigger={refreshTrigger}
                        limit={4}
                    />
                </div>
                <ManageFiles ref={manageFilesRef} onFileUploaded={handleFileUploaded} />
            </ToolBar>
        </div>
    );
}
