// ============================================
// PÁGINA DE LOGIN
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Mail, Lock, Loader } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useOnlineStatus from '../hooks/useOnlineStatus';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  const { login, loading, isAuthenticated } = useAuthStore();
  const isOnline = useOnlineStatus();
  
  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/pos');
    }
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate('/pos');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 flex items-center justify-center p-4">
      {/* Indicador de conexión */}
      <div className="fixed top-4 right-4">
        <div className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${
          isOnline ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {isOnline ? '🟢 En línea' : '🔴 Sin conexión'}
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <Coffee size={40} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">POS Cafetería</h1>
          <p className="text-blue-100">Sistema de Punto de Venta</p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoFocus
                disabled={loading}
              />
            </div>
          </div>
          
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
          
          {/* Credenciales de prueba */}
          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <p className="text-xs text-gray-600 font-medium mb-2">Credenciales de prueba:</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p><strong>Admin:</strong> admin@sistema.com / demo123</p>
              <p><strong>Cajero:</strong> cajero@sistema.com / demo123</p>
            </div>
          </div>
        </form>
        
        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-600 border-t">
          <p>© 2024 POS Cafetería - Versión 1.0.0</p>
        </div>
      </div>
    </div>
  );
}