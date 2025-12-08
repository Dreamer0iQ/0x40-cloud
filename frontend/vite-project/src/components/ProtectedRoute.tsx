import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';
import DataPulseLoader from '../elements/Logo/DataPulseLoader';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            if (!authService.isAuthenticated()) {
                setIsAuthenticated(false);
                setIsChecking(false);
                return;
            }

            try {
                // Проверяем валидность токена
                await authService.getMe();
                setIsAuthenticated(true);
            } catch (error) {
                // Токен невалиден
                authService.logout();
                setIsAuthenticated(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkAuth();
    }, []);

    if (isChecking) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                background: '#1E1E1E'
            }}>
                <DataPulseLoader width={80} height={80} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
