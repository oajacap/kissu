// ============================================
// STORE DEL CARRITO (POS)
// ============================================

import { create } from 'zustand';
import { toast } from 'react-hot-toast';

const useCartStore = create((set, get) => ({
  // Estado
  items: [],
  descuento: 0,
  
  // ============================================
  // AGREGAR PRODUCTO AL CARRITO
  // ============================================
  addItem: (producto) => {
    const { items } = get();
    
    // Verificar si el producto ya está en el carrito
    const existingItem = items.find(item => item.producto_id === producto.id);
    
    if (existingItem) {
      // Incrementar cantidad
      if (existingItem.cantidad >= producto.stock_actual) {
        toast.error(`Stock máximo alcanzado (${producto.stock_actual})`);
        return;
      }
      
      set({
        items: items.map(item =>
          item.producto_id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * item.precio_unitario
              }
            : item
        )
      });
      
      toast.success(`Cantidad actualizada: ${producto.nombre}`);
      
    } else {
      // Agregar nuevo item
      if (producto.stock_actual <= 0) {
        toast.error('Producto sin stock');
        return;
      }
      
      const newItem = {
        producto_id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo,
        precio_unitario: producto.precio_venta,
        cantidad: 1,
        subtotal: producto.precio_venta,
        stock_disponible: producto.stock_actual
      };
      
      set({ items: [...items, newItem] });
      toast.success(`Agregado: ${producto.nombre}`);
    }
  },
  
  // ============================================
  // ACTUALIZAR CANTIDAD
  // ============================================
  updateQuantity: (productoId, cantidad) => {
    const { items } = get();
    const item = items.find(i => i.producto_id === productoId);
    
    if (!item) return;
    
    // Validar cantidad
    if (cantidad <= 0) {
      get().removeItem(productoId);
      return;
    }
    
    if (cantidad > item.stock_disponible) {
      toast.error(`Stock máximo: ${item.stock_disponible}`);
      return;
    }
    
    set({
      items: items.map(i =>
        i.producto_id === productoId
          ? {
              ...i,
              cantidad,
              subtotal: cantidad * i.precio_unitario
            }
          : i
      )
    });
  },
  
  // ============================================
  // ELIMINAR ITEM
  // ============================================
  removeItem: (productoId) => {
    const { items } = get();
    set({ items: items.filter(item => item.producto_id !== productoId) });
    toast.success('Producto eliminado del carrito');
  },
  
  // ============================================
  // LIMPIAR CARRITO
  // ============================================
  clearCart: () => {
    set({ items: [], descuento: 0 });
  },
  
  // ============================================
  // ESTABLECER DESCUENTO
  // ============================================
  setDescuento: (descuento) => {
    if (descuento < 0) {
      toast.error('El descuento no puede ser negativo');
      return;
    }
    
    const { getTotal } = get();
    const subtotal = getTotal().subtotal;
    
    if (descuento > subtotal) {
      toast.error('El descuento no puede ser mayor al subtotal');
      return;
    }
    
    set({ descuento });
  },
  
  // ============================================
  // CALCULAR TOTALES
  // ============================================
  getTotal: () => {
    const { items, descuento } = get();
    
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal - descuento;
    
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      descuento: parseFloat(descuento.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      itemsCount: items.length,
      totalItems: items.reduce((sum, item) => sum + item.cantidad, 0)
    };
  },
  
  // ============================================
  // OBTENER DATOS PARA VENTA
  // ============================================
  getVentaData: (montoRecibido, metodoPago = 'efectivo', notas = null) => {
    const { items, descuento, getTotal } = get();
    const totales = getTotal();
    
    return {
      productos: items,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      total: totales.total,
      monto_recibido: parseFloat(montoRecibido),
      metodo_pago: metodoPago,
      notas
    };
  },
  
  // ============================================
  // VALIDAR CARRITO
  // ============================================
  validateCart: () => {
    const { items } = get();
    
    if (items.length === 0) {
      toast.error('El carrito está vacío');
      return false;
    }
    
    // Verificar que todos los items tengan stock
    for (const item of items) {
      if (item.cantidad > item.stock_disponible) {
        toast.error(`Stock insuficiente para ${item.nombre}`);
        return false;
      }
    }
    
    return true;
  }
}));

export default useCartStore;