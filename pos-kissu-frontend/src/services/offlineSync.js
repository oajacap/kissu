// ============================================
// SERVICIO DE SINCRONIZACIÓN OFFLINE
// ============================================

import localforage from 'localforage';
import axios from '../api/axiosConfig';
import { toast } from 'react-hot-toast';

// Configurar localforage
const ventasOfflineDB = localforage.createInstance({
  name: 'pos-cafeteria',
  storeName: 'ventas_offline'
});

const productosDB = localforage.createInstance({
  name: 'pos-cafeteria',
  storeName: 'productos_cache'
});

// ============================================
// GUARDAR VENTA OFFLINE
// ============================================
export const saveVentaOffline = async (ventaData, usuarioId) => {
  try {
    const timestamp = Date.now();
    const ventaOffline = {
      id: `offline_${timestamp}`,
      ...ventaData,
      usuario_id: usuarioId,
      fecha_venta: new Date().toISOString(),
      sincronizada: false,
      created_offline: true,
      timestamp
    };
    
    // Generar número de factura temporal
    const ventasOffline = await getAllVentasOffline();
    const numeroFactura = `TEMP-${String(ventasOffline.length + 1).padStart(6, '0')}`;
    ventaOffline.numero_factura = numeroFactura;
    
    // Calcular cambio
    ventaOffline.cambio = ventaOffline.monto_recibido - ventaOffline.total;
    
    // Guardar en IndexedDB
    await ventasOfflineDB.setItem(ventaOffline.id, ventaOffline);
    
    console.log('✅ Venta guardada offline:', ventaOffline);
    
    // Intentar sincronizar inmediatamente
    setTimeout(() => syncVentasOffline(), 2000);
    
    return ventaOffline;
    
  } catch (error) {
    console.error('Error al guardar venta offline:', error);
    throw error;
  }
};

// ============================================
// OBTENER TODAS LAS VENTAS OFFLINE
// ============================================
export const getAllVentasOffline = async () => {
  try {
    const ventas = [];
    await ventasOfflineDB.iterate((value) => {
      ventas.push(value);
    });
    return ventas.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error al obtener ventas offline:', error);
    return [];
  }
};

// ============================================
// SINCRONIZAR VENTAS OFFLINE
// ============================================
export const syncVentasOffline = async () => {
  // Verificar conexión
  if (!navigator.onLine) {
    console.log('⚠️ Sin conexión, sincronización postponida');
    return { success: false, reason: 'offline' };
  }
  
  try {
    const ventasOffline = await getAllVentasOffline();
    const ventasPendientes = ventasOffline.filter(v => !v.sincronizada);
    
    if (ventasPendientes.length === 0) {
      console.log('✅ No hay ventas pendientes de sincronizar');
      return { success: true, synced: 0 };
    }
    
    console.log(`🔄 Sincronizando ${ventasPendientes.length} ventas...`);
    
    let sincronizadas = 0;
    let errores = 0;
    
    for (const venta of ventasPendientes) {
      try {
        // Intentar crear venta en el servidor
        const response = await axios.post('/ventas', {
          cliente_id: venta.cliente_id,
          productos: venta.productos,
          subtotal: venta.subtotal,
          descuento: venta.descuento,
          total: venta.total,
          monto_recibido: venta.monto_recibido,
          metodo_pago: venta.metodo_pago,
          notas: `Sincronizada desde offline - ${venta.numero_factura}`
        });
        
        // Marcar como sincronizada
        venta.sincronizada = true;
        venta.numero_factura_servidor = response.data.data.numero_factura;
        venta.venta_id_servidor = response.data.data.venta_id;
        venta.fecha_sincronizacion = new Date().toISOString();
        
        await ventasOfflineDB.setItem(venta.id, venta);
        
        sincronizadas++;
        console.log(`✅ Venta sincronizada: ${venta.numero_factura} → ${response.data.data.numero_factura}`);
        
      } catch (error) {
        console.error(`❌ Error al sincronizar venta ${venta.numero_factura}:`, error);
        errores++;
      }
    }
    
    if (sincronizadas > 0) {
      toast.success(`${sincronizadas} venta(s) sincronizada(s)`);
    }
    
    if (errores > 0) {
      toast.error(`${errores} venta(s) no pudieron sincronizarse`);
    }
    
    return {
      success: true,
      synced: sincronizadas,
      errors: errores
    };
    
  } catch (error) {
    console.error('Error en sincronización:', error);
    return { success: false, error };
  }
};

// ============================================
// LIMPIAR VENTAS SINCRONIZADAS
// ============================================
export const cleanSyncedVentas = async (olderThanDays = 7) => {
  try {
    const ventas = await getAllVentasOffline();
    const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    let removidas = 0;
    
    for (const venta of ventas) {
      if (venta.sincronizada && venta.timestamp < cutoffDate) {
        await ventasOfflineDB.removeItem(venta.id);
        removidas++;
      }
    }
    
    console.log(`🧹 ${removidas} ventas antiguas eliminadas`);
    return removidas;
    
  } catch (error) {
    console.error('Error al limpiar ventas:', error);
    return 0;
  }
};

// ============================================
// CACHEAR PRODUCTOS
// ============================================
export const cacheProductos = async (productos) => {
  try {
    await productosDB.setItem('productos', {
      data: productos,
      timestamp: Date.now()
    });
    console.log(`✅ ${productos.length} productos cacheados`);
  } catch (error) {
    console.error('Error al cachear productos:', error);
  }
};

// ============================================
// OBTENER PRODUCTOS DEL CACHE
// ============================================
export const getCachedProductos = async () => {
  try {
    const cache = await productosDB.getItem('productos');
    
    if (!cache) {
      return null;
    }
    
    // Verificar si el cache tiene menos de 1 hora
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - cache.timestamp > oneHour) {
      console.log('⚠️ Cache de productos expirado');
      return null;
    }
    
    console.log('✅ Productos obtenidos del cache');
    return cache.data;
    
  } catch (error) {
    console.error('Error al obtener productos del cache:', error);
    return null;
  }
};

// ============================================
// OBTENER ESTADÍSTICAS OFFLINE
// ============================================
export const getOfflineStats = async () => {
  const ventas = await getAllVentasOffline();
  const pendientes = ventas.filter(v => !v.sincronizada);
  const sincronizadas = ventas.filter(v => v.sincronizada);
  
  return {
    total: ventas.length,
    pendientes: pendientes.length,
    sincronizadas: sincronizadas.length,
    montoTotal: ventas.reduce((sum, v) => sum + (v.total || 0), 0)
  };
};

// ============================================
// INICIALIZAR LISTENER DE CONEXIÓN
// ============================================
export const initSyncListener = () => {
  // Sincronizar cuando se recupera la conexión
  window.addEventListener('online', () => {
    console.log('🌐 Conexión restaurada, sincronizando...');
    toast.success('Conexión restaurada');
    syncVentasOffline();
  });
  
  window.addEventListener('offline', () => {
    console.log('📴 Sin conexión - Modo offline activado');
    toast.warning('Sin conexión. Las ventas se guardarán localmente.');
  });
  
  // Sincronizar periódicamente
  setInterval(() => {
    if (navigator.onLine) {
      syncVentasOffline();
    }
  }, 5 * 60 * 1000); // Cada 5 minutos
};