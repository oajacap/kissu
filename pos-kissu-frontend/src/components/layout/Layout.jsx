// ============================================
// LAYOUT PRINCIPAL
// ============================================

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { getOfflineStats } from '../../services/offlineSync';
import { useEffect } from 'react';

const NAV_ITEMS = [
  { path: '/pos', label: 'Punto de Venta', icon: ShoppingCart },
  { path: '/ventas', label: 'Ventas', icon: DollarSign },
  { path: '/productos', label: 'Productos', icon: Package },
  { path: '/caja', label: 'Caja', icon: DollarSign },
  { path: '/reportes', label: 'Reportes', icon: BarChart3 }
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [offlineStats, setOfflineStats] = useState(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  
  useEffect(() => {
    // Actualizar estadísticas offline cada 10 segundos
    const updateStats = async () => {
      const stats = await getOfflineStats();
      setOfflineStats(stats);
    };
    
    updateStats();
    const interval = setInterval(updateStats, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleLogout = () => {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
      logout();
      navigate('/login');
    }
  };
  
  return (
    <div className="h-screen flex bg-gray-100">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex md:flex-col w-64 bg-gray-900 text-white">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">POS Cafetería</h1>
          <p className="text-sm text-gray-400 mt-1">Sistema Profesional</p>
        </div>
        
        {/* Usuario */}
        <div className="p-4 border-b border-gray-800 bg-gray-800">
          <p className="font-medium">{user?.nombre}</p>
          <p className="text-sm text-gray-400">{user?.rol}</p>
        </div>
        
        {/* Estado de conexión */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi size={16} className="text-green-400" />
                <span className="text-sm text-green-400">En línea</span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-yellow-400" />
                <span className="text-sm text-yellow-400">Offline</span>
              </>
            )}
          </div>
          
          {offlineStats && offlineStats.pendientes > 0 && (
            <p className="text-xs text-yellow-400 mt-1">
              {offlineStats.pendientes} venta(s) pendiente(s)
            </p>
          )}
        </div>
        
        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`
                }
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        
        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
      
      {/* SIDEBAR MOBILE */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 text-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h1 className="text-xl font-bold">POS Cafetería</h1>
              <button onClick={() => setSidebarOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            {/* Usuario */}
            <div className="p-4 border-b border-gray-800 bg-gray-800">
              <p className="font-medium">{user?.nombre}</p>
              <p className="text-sm text-gray-400">{user?.rol}</p>
            </div>
            
            {/* Navegación */}
            <nav className="p-4 space-y-2">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`
                    }
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            
            {/* Logout */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-800 rounded-lg"
              >
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}
      
      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <header className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold">POS Cafetería</h1>
          <div className="w-6" />
        </header>
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}