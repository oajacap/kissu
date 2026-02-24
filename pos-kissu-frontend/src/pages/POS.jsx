// ============================================
// PÁGINA PRINCIPAL DE POS
// ============================================

import { useState, useEffect } from 'react';
import { Search, ShoppingCart, DollarSign } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import axios from '../api/axiosConfig';
import { toast } from 'react-hot-toast';
import PaymentModal from '../components/pos/PaymentModal';
import Cart from '../components/pos/Cart';
import ProductGrid from '../components/pos/ProductGrid';
import EstadoCaja from '../components/caja/EstadoCaja';

export default function POS() {
  const [productos, setProductos] = useState([]);
  const [filteredProductos, setFilteredProductos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelected, setCategoriaSelected] = useState(null);
  
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const totales = getTotal();
  
  // ============================================
  // CARGAR PRODUCTOS
  // ============================================
  useEffect(() => {
    loadProductos();
    loadCategorias();
  }, []);
  
  const loadProductos = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/productos');
      const data = response.data.data;
      setProductos(data);
      setFilteredProductos(data);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };
  
  const loadCategorias = async () => {
    try {
      const response = await axios.get('/categorias');
      setCategorias(response.data.data);
    } catch (error) {
      console.error('Error al cargar categorías');
    }
  };
  
  // ============================================
  // FILTRAR PRODUCTOS
  // ============================================
  useEffect(() => {
    let filtered = productos;
    
    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por categoría
    if (categoriaSelected) {
      filtered = filtered.filter(p => p.categoria_id === categoriaSelected);
    }
    
    setFilteredProductos(filtered);
  }, [searchTerm, productos, categoriaSelected]);
  
  // ============================================
  // MANEJAR PAGO
  // ============================================
  const handleProcesarVenta = () => {
    if (items.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    
    setShowPaymentModal(true);
  };
  
  const handleVentaCompletada = () => {
    setShowPaymentModal(false);
    clearCart();
    setSearchTerm('');
    toast.success('Venta completada exitosamente');
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* HEADER */}
      <div className="bg-white shadow-md px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Punto de Venta</h1>
            <p className="text-sm text-gray-500">
              Cajero: {user?.nombre} | Rol: {user?.rol}
            </p>
          </div>
          
          <EstadoCaja />
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL IZQUIERDO - PRODUCTOS */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* BÚSQUEDA Y FILTROS */}
          <div className="mb-4 space-y-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            {/* Categorías */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setCategoriaSelected(null)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  !categoriaSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                Todos
              </button>
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaSelected(cat.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                    categoriaSelected === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>
          
          {/* GRID DE PRODUCTOS */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <ProductGrid productos={filteredProductos} />
            )}
          </div>
        </div>
        
        {/* PANEL DERECHO - CARRITO */}
        <div className="w-96 bg-white shadow-xl flex flex-col">
          <div className="p-4 bg-gray-800 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={24} />
                <h2 className="text-xl font-bold">Carrito</h2>
              </div>
              <span className="bg-blue-600 px-3 py-1 rounded-full text-sm">
                {totales.totalItems} items
              </span>
            </div>
          </div>
          
          {/* CARRITO */}
          <div className="flex-1 overflow-auto">
            <Cart />
          </div>
          
          {/* TOTALES */}
          <div className="p-4 border-t bg-gray-50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">Q{totales.subtotal.toFixed(2)}</span>
              </div>
              {totales.descuento > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Descuento:</span>
                  <span>-Q{totales.descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-blue-600">Q{totales.total.toFixed(2)}</span>
              </div>
            </div>
            
            <button
              onClick={handleProcesarVenta}
              disabled={items.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-colors"
            >
              <DollarSign size={24} />
              Procesar Venta
            </button>
          </div>
        </div>
      </div>
      
      {/* MODAL DE PAGO */}
      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handleVentaCompletada}
        />
      )}
    </div>
  );
}