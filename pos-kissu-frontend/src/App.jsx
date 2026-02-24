// ============================================
// APP PRINCIPAL
// ============================================

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import useOnlineStatus from './hooks/useOnlineStatus';
import { initSyncListener, getOfflineStats } from './services/offlineSync';

// Pages
import Login from './pages/Login';
import POS from './pages/POS';
import Ventas from './pages/Ventas';
import Productos from './pages/Productos';
import Caja from './pages/Caja';
import Reportes from './pages/Reportes';

// Layout
import Layout from './components/layout/Layout';

// ============================================
// RUTA PROTEGIDA
// ============================================
function ProtectedRoute({ children }) {
  const { isAuthenticated, validateSession } = useAuthStore();
  
  useEffect(() => {
    validateSession();
  }, []);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// ============================================
// APP PRINCIPAL
// ============================================
export default function App() {
  const isOnline = useOnlineStatus();
  
  useEffect(() => {
    // Inicializar listener de sincronización
    initSyncListener();
    
    // Mostrar estadísticas offline en consola
    getOfflineStats().then(stats => {
      console.log('📊 Estadísticas Offline:', stats);
    });
  }, []);
  
  return (
    <BrowserRouter>
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {/* Indicador de estado de conexión */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          ⚠️ Sin conexión - Trabajando en modo offline
        </div>
      )}
      
      {/* Rutas */}
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />
        
        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/pos" replace />} />
          <Route path="pos" element={<POS />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="productos" element={<Productos />} />
          <Route path="caja" element={<Caja />} />
          <Route path="reportes" element={<Reportes />} />
        </Route>
        
        {/* Ruta 404 */}
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}