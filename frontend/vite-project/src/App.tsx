import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login/login';
import Dashboard from './pages/dashboard/dashboard';
import Storage from './pages/storage/storage';
import Favourites from './pages/favourites/favourites';
import Images from './pages/images/images';
import Trash from './pages/trash/trash';
import ProtectedRoute from './components/ProtectedRoute';
import { authService } from './services/authService';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  return (
    <ThemeProvider>
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

          <Route path="/storage" element={
            <ProtectedRoute>
              <Storage onLogout={handleLogout} />
            </ProtectedRoute>
          } />

          <Route path="/favourites" element={
            <ProtectedRoute>
              <Favourites />
            </ProtectedRoute>
          } />

          <Route path="/images" element={
            <ProtectedRoute>
              <Images />
            </ProtectedRoute>
          } />

          <Route path="/trash" element={
            <ProtectedRoute>
              <Trash />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            authService.isAuthenticated()
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/login" replace />
          } />

          {/* 404 - редирект на главную */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
