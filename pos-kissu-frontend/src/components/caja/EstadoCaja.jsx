// ============================================
// COMPONENTE ESTADO DE CAJA
// ============================================

import { useState, useEffect } from 'react';
import { DollarSign, Lock, Unlock, TrendingUp, TrendingDown } from 'lucide-react';
import axios from '../../api/axiosConfig';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function EstadoCaja() {
  const [estadoCaja, setEstadoCaja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [accion, setAccion] = useState(null); // 'abrir' o 'cerrar'
  const { hasPermission } = useAuthStore();
  
  useEffect(() => {
    cargarEstadoCaja();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarEstadoCaja, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const cargarEstadoCaja = async () => {
    try {
      const response = await axios.get('/caja/estado');
      setEstadoCaja(response.data.data);
    } catch (error) {
      console.error('Error al cargar estado de caja:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAbrirCerrar = (tipo) => {
    if (!hasPermission(`caja.${tipo}`)) {
      toast.error('No tienes permisos para esta acción');
      return;
    }
    
    setAccion(tipo);
    setShowModal(true);
  };
  
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
        <span>Cargando...</span>
      </div>
    );
  }
  
  if (!estadoCaja || !estadoCaja.abierta) {
    return (
      <>
        <button
          onClick={() => handleAbrirCerrar('abrir')}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          <Unlock size={20} />
          Abrir Caja
        </button>
        
        {showModal && accion === 'abrir' && (
          <AbrirCajaModal
            onClose={() => setShowModal(false)}
            onSuccess={cargarEstadoCaja}
          />
        )}
      </>
    );
  }
  
  return (
    <>
      <div className="flex items-center gap-4">
        {/* Estado de caja */}
        <div className="bg-green-100 px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <Unlock size={20} />
            <div>
              <p className="text-xs font-medium">Caja Abierta</p>
              <p className="text-sm font-bold">Q{parseFloat(estadoCaja.monto_esperado).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        {/* Ventas y gastos */}
        <div className="flex gap-3 text-sm">
          <div className="flex items-center gap-1 text-green-600">
            <TrendingUp size={16} />
            <span>Q{parseFloat(estadoCaja.total_ventas).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1 text-red-600">
            <TrendingDown size={16} />
            <span>Q{parseFloat(estadoCaja.total_gastos).toFixed(2)}</span>
          </div>
        </div>
        
        {/* Botón cerrar caja */}
        <button
          onClick={() => handleAbrirCerrar('cerrar')}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          <Lock size={20} />
          Cerrar Caja
        </button>
      </div>
      
      {showModal && accion === 'cerrar' && (
        <CerrarCajaModal
          estadoCaja={estadoCaja}
          onClose={() => setShowModal(false)}
          onSuccess={cargarEstadoCaja}
        />
      )}
    </>
  );
}

// ============================================
// MODAL ABRIR CAJA
// ============================================
function AbrirCajaModal({ onClose, onSuccess }) {
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!monto || parseFloat(monto) < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post('/caja/abrir', {
        monto_inicial: parseFloat(monto),
        usuario_id: user.id,
        notas
      });
      
      toast.success('Caja abierta exitosamente');
      onSuccess();
      onClose();
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al abrir caja');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Abrir Caja</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto Inicial *
            </label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold"
            >
              {loading ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MODAL CERRAR CAJA
// ============================================
function CerrarCajaModal({ estadoCaja, onClose, onSuccess }) {
  const [montoFinal, setMontoFinal] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  
  const esperado = parseFloat(estadoCaja.monto_esperado);
  const diferencia = montoFinal ? parseFloat(montoFinal) - esperado : 0;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!montoFinal || parseFloat(montoFinal) < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post('/caja/cerrar', {
        monto_final: parseFloat(montoFinal),
        usuario_id: user.id,
        notas
      });
      
      const data = response.data.data;
      
      toast.success(`Caja cerrada. Diferencia: Q${data.diferencia}`);
      onSuccess();
      onClose();
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cerrar caja');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Cerrar Caja</h2>
        
        <div className="bg-gray-100 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Monto Inicial:</span>
            <span className="font-bold">Q{parseFloat(estadoCaja.monto_inicial).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Ventas:</span>
            <span className="font-bold">+Q{parseFloat(estadoCaja.total_ventas).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Gastos:</span>
            <span className="font-bold">-Q{parseFloat(estadoCaja.total_gastos).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Monto Esperado:</span>
            <span className="text-blue-600">Q{esperado.toFixed(2)}</span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto Real en Caja *
            </label>
            <input
              type="number"
              step="0.01"
              value={montoFinal}
              onChange={(e) => setMontoFinal(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 text-lg border-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
            
            {montoFinal && (
              <div className={`mt-2 p-2 rounded ${diferencia === 0 ? 'bg-green-100 text-green-800' : diferencia > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                <span className="font-bold">
                  Diferencia: {diferencia >= 0 ? '+' : ''}Q{diferencia.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas de Cierre (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-bold"
            >
              {loading ? 'Cerrando...' : 'Cerrar Caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}