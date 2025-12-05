import { useEffect, useState, useRef } from 'react';
import { authService } from '../../services/authService';
import styles from './images.module.scss';
import ToolBar from '../../elements/toolBar/toolbar';
import SearchBar from '../../elements/searchBar/searchbar';
import ManageFiles from '../../elements/manageFiles/manageFiles';
import Recommendations from '../../elements/recommendations/recommendations';

export default function Images() {
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
            // Передаем файлы в ManageFiles через ref
            if (manageFilesRef.current?.handleDroppedFiles) {
                manageFilesRef.current.handleDroppedFiles(e.dataTransfer.files);
            }
        }
    };

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
                <SearchBar />
                <h1 style={{ marginTop: "65px", padding: "25px", fontSize: "1.5rem", paddingLeft: "30px", color: "white" }}>Images</h1>
                <div className={styles.container} style={{ "marginTop": "60px", width: "80%" }}>
                    <Recommendations
                        title="Images"
                        type="images"
                        refreshTrigger={refreshTrigger}
                        limit={20}
                    />
                </div>
                <ManageFiles ref={manageFilesRef} onFileUploaded={handleFileUploaded} />
            </ToolBar>
        </div>
    );
}
