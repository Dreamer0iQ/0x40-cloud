import { useEffect, useState, useCallback } from 'react';
import Login from './pages/login/login';
import Dashboard from './pages/dashboard/dashboard';
import { authService } from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (authService.isAuthenticated()) {
      try {
        // Проверяем валидность токена
        await authService.getMe();
        setIsAuthenticated(true);
      } catch (error) {
        // Токен невалиден
        authService.logout();
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#1E1E1E',
        color: '#0060FF',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    );
  }

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Login onAuthSuccess={handleAuthSuccess} />;
}

export default App;
