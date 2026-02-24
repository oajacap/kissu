// ============================================
// CONFIGURACIÓN DE AXIOS
// ============================================

import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Crear instancia de axios
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ============================================
// INTERCEPTOR DE REQUEST
// ============================================
axiosInstance.interceptors.request.use(
  (config) => {
    // Agregar token de autenticación
    const token = localStorage.getItem('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log en desarrollo
    if (import.meta.env.DEV) {
      console.log('📤 Request:', config.method.toUpperCase(), config.url);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// INTERCEPTOR DE RESPONSE
// ============================================
axiosInstance.interceptors.response.use(
  (response) => {
    // Log en desarrollo
    if (import.meta.env.DEV) {
      console.log('📥 Response:', response.config.url, response.data);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Error de red (offline)
    if (!error.response) {
      toast.error('Sin conexión a internet. Los datos se guardarán localmente.');
      return Promise.reject({ offline: true, ...error });
    }
    
    // Token expirado (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Intentar refrescar token o redirigir a login
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token } = response.data.data;
          localStorage.setItem('access_token', access_token);
          
          // Reintentar request original
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axiosInstance(originalRequest);
          
        } catch (refreshError) {
          // Refresh falló, cerrar sesión
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No hay refresh token, cerrar sesión
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    
    // Otros errores
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        'Error en la solicitud';
    
    if (error.response?.status >= 500) {
      toast.error('Error del servidor. Intenta nuevamente.');
    } else if (error.response?.status === 403) {
      toast.error('No tienes permisos para esta acción');
    } else if (error.response?.status !== 401) {
      toast.error(errorMessage);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;