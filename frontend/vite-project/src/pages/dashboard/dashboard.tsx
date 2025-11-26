import { useEffect, useState } from 'react';
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
    
    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    return (
        <div className={styles.dashboardWrapper}>
            <ToolBar>
                <SearchBar></SearchBar>
                <div className={styles.container} style={{"marginTop": "60px"}}>
                    {/* Недавние файлы */}
                    <Recommendations refreshTrigger={refreshTrigger} limit={10} />
                    
                    {/* Список всех файлов */}
                    {/* <FileList refreshTrigger={refreshTrigger} /> */}
                </div>
                <ManageFiles onFileUploaded={handleFileUploaded} />
            </ToolBar>        
        </div>
    );
}
