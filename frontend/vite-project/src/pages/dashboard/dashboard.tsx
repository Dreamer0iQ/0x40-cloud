import { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import type { User } from '../../types/auth';
import styles from './dashboard.module.scss';
import ToolBar from '../../elements/toolBar/toolbar';
import SearchBar from '../../elements/searchBar/searchbar';
import ManageFiles from '../../elements/manageFiles/manageFiles';
import Recommendations from '../../elements/recommendations/recommendations';
import StorageStats from '../../elements/storageStats/storageStats';

interface DashboardProps {
    onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

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
                                    <StorageStats 
                diskUsed={11.91}
                diskTotal={9.76}
                filesByType={{
                    documents: 45,
                    images: 999,
                    videos: 8,
                    other: 23
                }}
                />
                    <Recommendations files={[
                        { filename: "Client interview...", extension: "DOCX", lastAccess: "Just added • Dropbox" },
                        { filename: "Vaccine Statistics.xls", extension: "XLS", lastAccess: "45m ago • Local Computer" },
                        { filename: "E-Certificate.pdf", extension: "PDF", lastAccess: "1d ago" },
                        { filename: "E-Certificate.pdf", extension: "PDF", lastAccess: "1d ago" }
                        ]} />

                    <Recommendations files={[
                        { filename: "Client interview...", extension: "DOCX", lastAccess: "Just added • Dropbox" },
                        { filename: "Vaccine Statistics.xls", extension: "XLS", lastAccess: "45m ago • Local Computer" },
                        { filename: "E-Certificate.pdf", extension: "PDF", lastAccess: "1d ago" },
                        { filename: "E-Certificate.pdf", extension: "PDF", lastAccess: "1d ago" }
                        ]} title='Recent'/>
                </div>
                <ManageFiles></ManageFiles>
            </ToolBar>        
        </div>
    );
}
