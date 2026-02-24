// ============================================
// GRID DE PRODUCTOS (TÁCTIL)
// ============================================

import { Package } from 'lucide-react';
import useCartStore from '../../store/cartStore';

export default function ProductGrid({ productos }) {
  const { addItem } = useCartStore();
  
  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Package size={64} />
        <p className="mt-4 text-lg">No se encontraron productos</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {productos.map(producto => (
        <ProductCard
          key={producto.id}
          producto={producto}
          onAdd={addItem}
        />
      ))}
    </div>
  );
}

// ============================================
// CARD DE PRODUCTO
// ============================================
function ProductCard({ producto, onAdd }) {
  const stockClass = producto.stock_actual <= 0
    ? 'bg-red-100 border-red-300'
    : producto.stock_actual <= producto.stock_minimo
    ? 'bg-yellow-100 border-yellow-300'
    : 'bg-white border-gray-200';
  
  const handleClick = () => {
    if (producto.stock_actual > 0) {
      onAdd(producto);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={producto.stock_actual <= 0}
      className={`${stockClass} border-2 rounded-xl p-4 text-left transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 touch-manipulation`}
    >
      {/* Imagen del producto (placeholder) */}
      <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <Package size={48} className="text-gray-400" />
        )}
      </div>
      
      {/* Información del producto */}
      <div className="space-y-1">
        <p className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">
          {producto.nombre}
        </p>
        
        <p className="text-xs text-gray-500">
          Cód: {producto.codigo}
        </p>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-blue-600">
            Q{parseFloat(producto.precio_venta).toFixed(2)}
          </span>
          
          <span className={`text-xs px-2 py-1 rounded-full ${
            producto.stock_actual <= 0
              ? 'bg-red-200 text-red-800'
              : producto.stock_actual <= producto.stock_minimo
              ? 'bg-yellow-200 text-yellow-800'
              : 'bg-green-200 text-green-800'
          }`}>
            Stock: {producto.stock_actual}
          </span>
        </div>
      </div>
    </button>
  );
}