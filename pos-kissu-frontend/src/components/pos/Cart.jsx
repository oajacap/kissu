// ============================================
// COMPONENTE DEL CARRITO
// ============================================

import { Minus, Plus, Trash2, Tag } from 'lucide-react';
import useCartStore from '../../store/cartStore';
import { useState } from 'react';

export default function Cart() {
  const { items, updateQuantity, removeItem, descuento, setDescuento, clearCart } = useCartStore();
  const [showDescuento, setShowDescuento] = useState(false);
  const [descuentoInput, setDescuentoInput] = useState('');
  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
        <p className="text-center">
          Carrito vacío
          <br />
          <span className="text-sm">Selecciona productos para comenzar</span>
        </p>
      </div>
    );
  }
  
  const handleAplicarDescuento = () => {
    const valor = parseFloat(descuentoInput) || 0;
    setDescuento(valor);
    setShowDescuento(false);
    setDescuentoInput('');
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* LISTA DE ITEMS */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {items.map(item => (
          <CartItem
            key={item.producto_id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>
      
      {/* DESCUENTO */}
      <div className="px-4 py-2 border-t bg-gray-50">
        {!showDescuento ? (
          <button
            onClick={() => setShowDescuento(true)}
            className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 py-2"
          >
            <Tag size={18} />
            {descuento > 0 ? `Descuento: Q${descuento.toFixed(2)}` : 'Agregar descuento'}
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Monto del descuento"
              value={descuentoInput}
              onChange={(e) => setDescuentoInput(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAplicarDescuento}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Aplicar
              </button>
              <button
                onClick={() => {
                  setShowDescuento(false);
                  setDescuentoInput('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* LIMPIAR CARRITO */}
      <div className="px-4 py-2 border-t">
        <button
          onClick={() => {
            if (confirm('¿Limpiar todo el carrito?')) {
              clearCart();
            }
          }}
          className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 py-2"
        >
          <Trash2 size={18} />
          Limpiar carrito
        </button>
      </div>
    </div>
  );
}

// ============================================
// ITEM DEL CARRITO
// ============================================
function CartItem({ item, onUpdateQuantity, onRemove }) {
  const handleIncrement = () => {
    onUpdateQuantity(item.producto_id, item.cantidad + 1);
  };
  
  const handleDecrement = () => {
    if (item.cantidad > 1) {
      onUpdateQuantity(item.producto_id, item.cantidad - 1);
    }
  };
  
  const handleChangeQuantity = (e) => {
    const value = parseInt(e.target.value) || 1;
    onUpdateQuantity(item.producto_id, value);
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="font-medium text-gray-800 text-sm leading-tight">
            {item.nombre}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Q{item.precio_unitario.toFixed(2)} c/u
          </p>
        </div>
        
        <button
          onClick={() => onRemove(item.producto_id)}
          className="text-red-500 hover:text-red-700 p-1"
        >
          <Trash2 size={18} />
        </button>
      </div>
      
      <div className="flex items-center justify-between">
        {/* CONTROL DE CANTIDAD */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleDecrement}
            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded active:scale-95 touch-manipulation"
          >
            <Minus size={16} />
          </button>
          
          <input
            type="number"
            value={item.cantidad}
            onChange={handleChangeQuantity}
            className="w-14 text-center border border-gray-300 rounded py-1 font-medium"
            min="1"
            max={item.stock_disponible}
          />
          
          <button
            onClick={handleIncrement}
            disabled={item.cantidad >= item.stock_disponible}
            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded active:scale-95 touch-manipulation"
          >
            <Plus size={16} />
          </button>
        </div>
        
        {/* SUBTOTAL */}
        <span className="font-bold text-blue-600">
          Q{item.subtotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}