// ============================================
// MODAL DE PAGO
// ============================================

import { useState, useEffect, useRef } from 'react';
import { DollarSign, CreditCard, Smartphone, X, Printer } from 'lucide-react';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import axios from '../../api/axiosConfig';
import { toast } from 'react-hot-toast';
import { saveVentaOffline } from '../../services/offlineSync';
import { printTicket } from '../../utils/printer';

const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo', icon: DollarSign },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'transferencia', label: 'Transferencia', icon: Smartphone }
];

export default function PaymentModal({ onClose, onSuccess }) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [processing, setProcessing] = useState(false);
  const [ventaCompletada, setVentaCompletada] = useState(null);
  const inputRef = useRef(null);
  
  const { getVentaData, getTotal, validateCart } = useCartStore();
  const { user } = useAuthStore();
  const totales = getTotal();
  
  useEffect(() => {
    // Auto-focus en input de monto
    inputRef.current?.focus();
  }, []);
  
  // Calcular cambio
  const cambio = montoRecibido ? parseFloat(montoRecibido) - totales.total : 0;
  const montoValido = montoRecibido && parseFloat(montoRecibido) >= totales.total;
  
  // ============================================
  // PROCESAR VENTA
  // ============================================
  const handleProcesarVenta = async () => {
    // Validaciones
    if (!validateCart()) return;
    
    if (!montoRecibido || parseFloat(montoRecibido) < totales.total) {
      toast.error('El monto recibido es insuficiente');
      return;
    }
    
    setProcessing(true);
    
    try {
      const ventaData = getVentaData(montoRecibido, metodoPago);
      
      // Intentar crear venta en el servidor
      try {
        const response = await axios.post('/ventas', ventaData);
        const venta = response.data.data;
        
        setVentaCompletada(venta);
        toast.success('Venta registrada exitosamente');
        
        // Imprimir ticket automáticamente
        if (confirm('¿Desea imprimir el ticket?')) {
          await printTicket(venta);
        }
        
      } catch (error) {
        // Si falla (offline), guardar localmente
        if (error.offline || !navigator.onLine) {
          const ventaOffline = await saveVentaOffline(ventaData, user.id);
          
          setVentaCompletada({
            ...ventaOffline,
            offline: true
          });
          
          toast.success('Venta guardada offline. Se sincronizará cuando haya conexión.');
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error('Error al procesar venta:', error);
      toast.error(error.response?.data?.error || 'Error al procesar venta');
      setProcessing(false);
    }
  };
  
  // ============================================
  // FINALIZAR
  // ============================================
  const handleFinalizar = () => {
    onSuccess();
    onClose();
  };
  
  // ============================================
  // BOTONES RÁPIDOS DE MONTO
  // ============================================
  const QUICK_AMOUNTS = [
    { label: 'Q5', value: 5 },
    { label: 'Q10', value: 10 },
    { label: 'Q20', value: 20 },
    { label: 'Q50', value: 50 },
    { label: 'Q100', value: 100 },
    { label: 'Exacto', value: totales.total }
  ];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {!ventaCompletada ? (
          // ============================================
          // FORMULARIO DE PAGO
          // ============================================
          <>
            {/* HEADER */}
            <div className="bg-blue-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Procesar Pago</h2>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-blue-700 p-2 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* CONTENIDO */}
            <div className="p-6 space-y-6">
              {/* TOTAL A PAGAR */}
              <div className="bg-gray-100 p-6 rounded-lg text-center">
                <p className="text-gray-600 text-sm mb-2">Total a Pagar</p>
                <p className="text-5xl font-bold text-blue-600">
                  Q{totales.total.toFixed(2)}
                </p>
              </div>
              
              {/* MÉTODO DE PAGO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {METODOS_PAGO.map(metodo => {
                    const Icon = metodo.icon;
                    return (
                      <button
                        key={metodo.id}
                        onClick={() => setMetodoPago(metodo.id)}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                          metodoPago === metodo.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Icon size={32} className={metodoPago === metodo.id ? 'text-blue-600' : 'text-gray-600'} />
                        <span className="text-sm font-medium">{metodo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* MONTO RECIBIDO */}
              {metodoPago === 'efectivo' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto Recibido
                    </label>
                    <input
                      ref={inputRef}
                      type="number"
                      step="0.01"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-4 text-2xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* BOTONES RÁPIDOS */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Montos Rápidos
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {QUICK_AMOUNTS.map(amount => (
                        <button
                          key={amount.label}
                          onClick={() => setMontoRecibido(amount.value.toString())}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-sm"
                        >
                          {amount.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* CAMBIO */}
                  {montoRecibido && (
                    <div className={`p-4 rounded-lg ${cambio >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <p className="text-sm text-gray-600 mb-1">Cambio</p>
                      <p className={`text-3xl font-bold ${cambio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Q{Math.abs(cambio).toFixed(2)}
                      </p>
                      {cambio < 0 && (
                        <p className="text-sm text-red-600 mt-1">
                          Falta: Q{Math.abs(cambio).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* FOOTER */}
            <div className="p-6 bg-gray-50 rounded-b-xl flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcesarVenta}
                disabled={processing || (metodoPago === 'efectivo' && !montoValido)}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-bold text-lg"
              >
                {processing ? 'Procesando...' : 'Confirmar Venta'}
              </button>
            </div>
          </>
        ) : (
          // ============================================
          // VENTA COMPLETADA
          // ============================================
          <div className="p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                ¡Venta Completada!
              </h3>
              {ventaCompletada.offline && (
                <p className="text-yellow-600 text-sm">
                  ⚠️ Venta guardada offline - Se sincronizará automáticamente
                </p>
              )}
            </div>
            
            <div className="bg-gray-100 rounded-lg p-6 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Factura:</span>
                <span className="font-bold">{ventaCompletada.numero_factura}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-lg">Q{ventaCompletada.total?.toFixed(2)}</span>
              </div>
              {metodoPago === 'efectivo' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Cambio:</span>
                  <span className="font-bold text-green-600">Q{ventaCompletada.cambio?.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => printTicket(ventaCompletada)}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Printer size={20} />
                Imprimir Ticket
              </button>
              <button
                onClick={handleFinalizar}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              >
                Finalizar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}