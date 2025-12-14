import { useEffect, useState, useRef } from 'react';
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
import FullPageLoader from '../../elements/FullPageLoader/FullPageLoader';

interface StorageProps {
    onLogout: () => void;
}

export default function Storage({ onLogout }: StorageProps) {
    const [user, setUser] = useState<User | null>(null);
    console.log(user); // Fix unused variable
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [searchParams] = useSearchParams();
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0);
    const manageFilesRef = useRef<any>(null);

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
            await authService.logout();
            onLogout();
        } finally {
            setLoading(false);
        }
    };

    const handleFileUploaded = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Ignore if internal drag (from FileList)
        if (e.dataTransfer.types.includes('application/json')) {
            return;
        }

        dragCounterRef.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.types.includes('application/json')) {
            return;
        }

        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.types.includes('application/json')) {
            return;
        }
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
                <FullPageLoader />
            </div>
        );
    }

    return (
        <div
            className={styles.storageWrapper}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className={styles.dropOverlay}>
                    <div className={styles.dropMessage}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M20 21H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span>Отпустите файлы для загрузки</span>
                    </div>
                </div>
            )}
            <ToolBar>
                <SearchBar></SearchBar>
                <div className={styles.container}>
                    <Breadcrumbs currentPath={currentPath} basePath="/storage" onFileMove={handleFileUploaded} />

                    <FileList
                        refreshTrigger={refreshTrigger}
                        currentPath={currentPath}
                    />
                </div>
                <ManageFiles ref={manageFilesRef} onFileUploaded={handleFileUploaded} currentPath={currentPath} />
            </ToolBar>
        </div>
    );
}
