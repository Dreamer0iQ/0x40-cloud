import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login/login';
import Dashboard from './pages/dashboard/dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { authService } from './services/authService';

function App() {
  const handleLogout = () => {
    authService.logout();
    // Перенаправление будет выполнено автоматически через ProtectedRoute
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные роуты */}
        <Route path="/login" element={<Login onAuthSuccess={() => {
          // Перенаправляем на dashboard после успешного входа
          window.location.href = '/dashboard';
        }} />} />
        
        {/* Защищенные роуты */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        
        {/* Редирект по умолчанию */}
        <Route path="/" element={
          authService.isAuthenticated() 
            ? <Navigate to="/dashboard" replace /> 
            : <Navigate to="/login" replace />
        } />
        
        {/* 404 - редирект на главную */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
