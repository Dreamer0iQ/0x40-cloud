import { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import styles from './images.module.scss';
import ToolBar from '../../elements/toolBar/toolbar';
import SearchBar from '../../elements/searchBar/searchbar';
import ManageFiles from '../../elements/manageFiles/manageFiles';
import Recommendations from '../../elements/recommendations/recommendations';

export default function Images() {
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
        <div className={styles.dashboardWrapper}>
            <ToolBar>
                <SearchBar />
                <div className={styles.container} style={{ "marginTop": "60px" }}>
                    <Recommendations
                        title="Images"
                        type="images"
                        refreshTrigger={refreshTrigger}
                        limit={20}
                    />
                </div>
                <ManageFiles onFileUploaded={handleFileUploaded} />
            </ToolBar>
        </div>
    );
}
