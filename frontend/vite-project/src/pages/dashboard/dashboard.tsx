import { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import type { User } from '../../types/auth';
import styles from './dashboard.module.scss';

interface DashboardProps {
    onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await authService.getMe();
            setUser(userData);
        } catch (error) {
            console.error('Failed to load user:', error);
            // Если не удалось загрузить пользователя, вызываем logout
            authService.logout();
            onLogout();
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        authService.logout();
        onLogout();
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>0x40 Cloud Dashboard</h1>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                    Logout
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.card}>
                    <h2>Welcome, {user?.username}!</h2>
                    <div className={styles.userInfo}>
                        <p><strong>Email:</strong> {user?.email}</p>
                        <p><strong>User ID:</strong> {user?.id}</p>
                        <p><strong>Joined:</strong> {new Date(user?.created_at || '').toLocaleDateString()}</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h3>🎉 Authentication Successful!</h3>
                    <p>Your frontend is now connected to the backend API.</p>
                </div>
            </div>
        </div>
    );
}
