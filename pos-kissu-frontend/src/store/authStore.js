// ============================================
// STORE DE AUTENTICACIÓN (ZUSTAND)
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from '../api/axiosConfig';
import { toast } from 'react-hot-toast';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado
      user: null,
      isAuthenticated: false,
      loading: false,
      
      // ============================================
      // LOGIN
      // ============================================
      login: async (email, password) => {
        set({ loading: true });
        
        try {
          const response = await axios.post('/auth/login', {
            email,
            password
          });
          
          const { user, accessToken, refreshToken } = response.data.data;
          
          // Guardar tokens
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          
          // Actualizar estado
          set({
            user,
            isAuthenticated: true,
            loading: false
          });
          
          toast.success(`Bienvenido ${user.nombre}`);
          
          return { success: true };
          
        } catch (error) {
          set({ loading: false });
          
          const errorMessage = error.response?.data?.error || 
                              'Error al iniciar sesión';
          toast.error(errorMessage);
          
          return { success: false, error: errorMessage };
        }
      },
      
      // ============================================
      // LOGOUT
      // ============================================
      logout: () => {
        // Limpiar tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // Limpiar estado
        set({
          user: null,
          isAuthenticated: false
        });
        
        toast.success('Sesión cerrada');
      },
      
      // ============================================
      // OBTENER PERFIL
      // ============================================
      getProfile: async () => {
        try {
          const response = await axios.get('/auth/profile');
          const user = response.data.data;
          
          set({ user });
          
          return { success: true, user };
          
        } catch (error) {
          // Si falla, cerrar sesión
          get().logout();
          return { success: false };
        }
      },
      
      // ============================================
      // VALIDAR SESIÓN
      // ============================================
      validateSession: async () => {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return false;
        }
        
        try {
          const response = await axios.post('/auth/validate');
          
          if (response.data.data.valid) {
            // Sesión válida, obtener perfil actualizado
            await get().getProfile();
            return true;
          } else {
            get().logout();
            return false;
          }
          
        } catch (error) {
          get().logout();
          return false;
        }
      },
      
      // ============================================
      // CAMBIAR CONTRASEÑA
      // ============================================
      changePassword: async (currentPassword, newPassword) => {
        try {
          await axios.put('/auth/change-password', {
            currentPassword,
            newPassword
          });
          
          toast.success('Contraseña actualizada correctamente');
          return { success: true };
          
        } catch (error) {
          const errorMessage = error.response?.data?.error || 
                              'Error al cambiar contraseña';
          toast.error(errorMessage);
          
          return { success: false, error: errorMessage };
        }
      },
      
      // ============================================
      // VERIFICAR PERMISOS
      // ============================================
      hasPermission: (permission) => {
        const { user } = get();
        
        if (!user) return false;
        
        // Admin tiene todos los permisos
        if (user.rol === 'admin') return true;
        
        // Mapeo de permisos por rol
        const permissions = {
          supervisor: [
            'productos.crear',
            'productos.editar',
            'productos.listar',
            'ventas.crear',
            'ventas.listar',
            'ventas.anular',
            'caja.abrir',
            'caja.cerrar',
            'reportes.ventas'
          ],
          cajero: [
            'productos.listar',
            'ventas.crear',
            'ventas.listar',
            'caja.abrir',
            'caja.cerrar'
          ]
        };
        
        return permissions[user.rol]?.includes(permission) || false;
      },
      
      // ============================================
      // VERIFICAR ROL
      // ============================================
      hasRole: (...roles) => {
        const { user } = get();
        return user ? roles.includes(user.rol) : false;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;