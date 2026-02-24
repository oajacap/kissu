// ============================================
// UTILIDAD DE IMPRESIÓN DE TICKETS
// ============================================

/**
 * Imprime un ticket de venta
 * Compatible con impresoras térmicas de 58mm y 80mm
 */
export const printTicket = async (venta) => {
  try {
    const ticketHTML = generateTicketHTML(venta);
    
    // Crear ventana de impresión
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Por favor, permite ventanas emergentes para imprimir');
      return;
    }
    
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
    
    // Esperar a que cargue y luego imprimir
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      
      // Cerrar ventana después de imprimir
      setTimeout(() => {
        printWindow.close();
      }, 100);
    };
    
    return true;
    
  } catch (error) {
    console.error('Error al imprimir ticket:', error);
    alert('Error al imprimir ticket');
    return false;
  }
};

/**
 * Genera el HTML del ticket
 */
const generateTicketHTML = (venta) => {
  const fecha = new Date(venta.fecha || venta.fecha_venta);
  const fechaFormateada = fecha.toLocaleString('es-GT');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket - ${venta.numero_factura}</title>
  <style>
    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      width: 80mm;
      padding: 10px;
    }
    
    .ticket {
      width: 100%;
    }
    
    .header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header p {
      font-size: 11px;
      margin: 2px 0;
    }
    
    .info {
      margin-bottom: 15px;
      font-size: 11px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
    }
    
    .items {
      margin-bottom: 15px;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 10px 0;
    }
    
    .item {
      margin-bottom: 8px;
    }
    
    .item-name {
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .item-details {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    
    .totals {
      margin-bottom: 15px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }
    
    .total-row.main {
      font-size: 14px;
      font-weight: bold;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 8px 0;
      margin: 10px 0;
    }
    
    .payment {
      margin-bottom: 15px;
      border-top: 1px dashed #000;
      padding-top: 10px;
    }
    
    .footer {
      text-align: center;
      font-size: 11px;
      border-top: 2px dashed #000;
      padding-top: 10px;
    }
    
    .footer p {
      margin: 3px 0;
    }
    
    .barcode {
      text-align: center;
      margin: 10px 0;
      font-family: 'Libre Barcode 128', monospace;
      font-size: 40px;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <!-- HEADER -->
    <div class="header">
      <h1>CAFETERÍA</h1>
      <p>Sistema POS</p>
      <p>NIT: 12345678-9</p>
      <p>Guatemala, Guatemala</p>
      <p>Tel: 2234-5678</p>
    </div>
    
    <!-- INFO DE LA VENTA -->
    <div class="info">
      <div class="info-row">
        <span>Factura:</span>
        <strong>${venta.numero_factura}</strong>
      </div>
      <div class="info-row">
        <span>Fecha:</span>
        <span>${fechaFormateada}</span>
      </div>
      ${venta.usuario_nombre ? `
      <div class="info-row">
        <span>Cajero:</span>
        <span>${venta.usuario_nombre}</span>
      </div>
      ` : ''}
      ${venta.cliente_nombre ? `
      <div class="info-row">
        <span>Cliente:</span>
        <span>${venta.cliente_nombre}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- ITEMS -->
    <div class="items">
      ${generateItemsHTML(venta.detalles || venta.productos)}
    </div>
    
    <!-- TOTALES -->
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>Q${parseFloat(venta.subtotal || 0).toFixed(2)}</span>
      </div>
      ${venta.descuento > 0 ? `
      <div class="total-row">
        <span>Descuento:</span>
        <span>-Q${parseFloat(venta.descuento).toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row main">
        <span>TOTAL:</span>
        <span>Q${parseFloat(venta.total).toFixed(2)}</span>
      </div>
    </div>
    
    <!-- PAGO -->
    ${venta.monto_recibido ? `
    <div class="payment">
      <div class="total-row">
        <span>Efectivo:</span>
        <span>Q${parseFloat(venta.monto_recibido).toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>Cambio:</span>
        <span>Q${parseFloat(venta.cambio || 0).toFixed(2)}</span>
      </div>
    </div>
    ` : ''}
    
    <!-- FOOTER -->
    <div class="footer">
      <p>¡Gracias por su compra!</p>
      <p>Vuelva pronto</p>
      ${venta.offline ? '<p style="margin-top: 10px; font-size: 10px;">⚠️ Ticket generado offline</p>' : ''}
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Genera el HTML de los items del ticket
 */
const generateItemsHTML = (items) => {
  if (!items || items.length === 0) {
    return '<p>Sin items</p>';
  }
  
  return items.map(item => {
    const nombre = item.nombre || item.producto_nombre;
    const cantidad = item.cantidad;
    const precio = parseFloat(item.precio_unitario);
    const subtotal = parseFloat(item.subtotal);
    
    return `
      <div class="item">
        <div class="item-name">${nombre}</div>
        <div class="item-details">
          <span>${cantidad} x Q${precio.toFixed(2)}</span>
          <span>Q${subtotal.toFixed(2)}</span>
        </div>
      </div>
    `;
  }).join('');
};

/**
 * Imprime directamente en impresora ESC/POS (avanzado)
 */
export const printESCPOS = async (venta) => {
  // Esta función requiere un driver o librería específica para impresoras térmicas
  // Por ejemplo: react-thermal-printer o comunicación con servidor de impresión
  
  console.log('Impresión ESC/POS no implementada aún');
  console.log('Para producción, integrar con driver de impresora térmica');
  
  // Alternativa: usar Web Serial API (Chrome)
  if ('serial' in navigator) {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      
      // Enviar comandos ESC/POS
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      
      // Ejemplo básico
      await writer.write(encoder.encode('\x1B\x40')); // Inicializar
      await writer.write(encoder.encode('CAFETERÍA\n'));
      await writer.write(encoder.encode('------------------------\n'));
      await writer.write(encoder.encode(`Factura: ${venta.numero_factura}\n`));
      await writer.write(encoder.encode('\x1D\x56\x00')); // Cortar papel
      
      writer.releaseLock();
      await port.close();
      
      return true;
    } catch (error) {
      console.error('Error con impresora serial:', error);
      return false;
    }
  }
  
  return false;
};