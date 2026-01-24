// ============================================
// SISTEMA DE FACTURACIÓN - FRONTEND
// ============================================

const API_URL = 'http://localhost:3000/api';
let carrito = [];
let usuarioActual = null;

// ============================================
// VERIFICAR SESIÓN AL CARGAR
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    const usuarioData = localStorage.getItem('usuario');
    
    if (!usuarioData) {
        window.location.href = 'login.html';
        return;
    }
    
    usuarioActual = JSON.parse(usuarioData);
    document.getElementById('nombreUsuario').textContent = usuarioActual.nombre;
    document.getElementById('rolUsuario').textContent = usuarioActual.rol.toUpperCase();
    
    // Mostrar menú de usuarios solo para admin
    if (usuarioActual.rol === 'admin') {
        document.getElementById('menuUsuarios').style.display = 'block';
    }
    
    verificarEstadoCaja();
});

// ============================================
// CERRAR SESIÓN
// ============================================
document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        localStorage.removeItem('usuario');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
});

// ============================================
// NAVEGACIÓN ENTRE SECCIONES
// ============================================
document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.dataset.section;
        
        document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById(section).classList.add('active');
        
        cargarSeccion(section);
    });
});

function cargarSeccion(section) {
    switch(section) {
        case 'ventas':
            verificarEstadoCaja();
            break;
        case 'productos':
            cargarProductos();
            break;
        case 'inventario':
            cargarInventario();
            break;
        case 'proveedores':
            cargarProveedores();
            break;
        case 'gastos':
            cargarGastos();
            break;
        case 'lotes':
            cargarLotes();
            break;
        case 'reportes':
            cargarReportes();
            break;
        case 'usuarios':
            if (usuarioActual.rol === 'admin') {
                cargarUsuarios();
            }
            break;
    }
}

// ============================================
// VENTAS - GESTIÓN DE CAJA
// ============================================
async function verificarEstadoCaja() {
    try {
        const response = await fetch(`${API_URL}/caja/estado`);
        const data = await response.json();
        
        const estadoDiv = document.getElementById('estadoCaja');
        const btnAbrir = document.getElementById('btnAbrirCaja');
        const btnCerrar = document.getElementById('btnCerrarCaja');
        
        if (data.abierta) {
            estadoDiv.innerHTML = `
                <p><strong> Caja Abierta</strong></p>
                <p>Monto Inicial: Q${parseFloat(data.monto_inicial).toFixed(2)}</p>
                <p>Total Ventas: Q${parseFloat(data.total_ventas).toFixed(2)}</p>
                <p>Total Gastos: Q${parseFloat(data.total_gastos).toFixed(2)}</p>
            `;
            btnAbrir.style.display = 'none';
            btnCerrar.style.display = 'inline-block';
        } else {
            estadoDiv.innerHTML = '<p class="text-danger"> Caja Cerrada - Debe abrir la caja para realizar ventas</p>';
            btnAbrir.style.display = 'inline-block';
            btnCerrar.style.display = 'none';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('btnAbrirCaja').addEventListener('click', async () => {
    const monto = prompt('Ingrese el monto inicial de caja:');
    if (monto && parseFloat(monto) >= 0) {
        try {
            const response = await fetch(`${API_URL}/caja/abrir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    monto_inicial: parseFloat(monto), 
                    usuario_id: usuarioActual.id 
                })
            });
            
            if (response.ok) {
                alert('Caja abierta exitosamente');
                verificarEstadoCaja();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al abrir la caja');
        }
    }
});

document.getElementById('btnCerrarCaja').addEventListener('click', async () => {
    const monto = prompt('Ingrese el monto final de caja:');
    if (monto && parseFloat(monto) >= 0) {
        try {
            const response = await fetch(`${API_URL}/caja/cerrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monto_final: parseFloat(monto) })
            });
            
            const data = await response.json();
            if (response.ok) {
                alert(`Caja cerrada exitosamente\nDiferencia: Q${data.diferencia.toFixed(2)}`);
                verificarEstadoCaja();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cerrar la caja');
        }
    }
});

// ============================================
// VENTAS - BÚSQUEDA DE PRODUCTOS
// ============================================
let timeoutBusqueda;
document.getElementById('buscarProducto').addEventListener('input', (e) => {
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(() => {
        buscarProductos(e.target.value);
    }, 300);
});

async function buscarProductos(termino) {
    if (termino.length < 2) {
        document.getElementById('resultadosProductos').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/productos`);
        const productos = await response.json();
        
        const filtrados = productos.filter(p => 
            p.nombre.toLowerCase().includes(termino.toLowerCase()) ||
            p.codigo.toLowerCase().includes(termino.toLowerCase())
        );
        
        const html = filtrados.map(p => `
            <div class="producto-item" onclick="agregarAlCarrito(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${p.precio_venta}, ${p.stock_actual})">
                <strong>${p.codigo}</strong> - ${p.nombre}<br>
                Precio: Q${p.precio_venta} | Stock: ${p.stock_actual}
            </div>
        `).join('');
        
        document.getElementById('resultadosProductos').innerHTML = html || '<p>No se encontraron productos</p>';
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// VENTAS - GESTIÓN DEL CARRITO
// ============================================
function agregarAlCarrito(id, nombre, precio, stock) {
    const existe = carrito.find(item => item.producto_id === id);
    
    if (existe) {
        if (existe.cantidad < stock) {
            existe.cantidad++;
            existe.subtotal = existe.cantidad * existe.precio_unitario;
        } else {
            alert('No hay suficiente stock');
            return;
        }
    } else {
        if (stock <= 0) {
            alert('Producto sin stock');
            return;
        }
        carrito.push({
            producto_id: id,
            nombre: nombre,
            precio_unitario: precio,
            cantidad: 1,
            subtotal: precio
        });
    }
    
    actualizarCarrito();
}

function actualizarCarrito() {
    const tbody = document.querySelector('#tablaCarrito tbody');
    tbody.innerHTML = carrito.map((item, index) => `
        <tr>
            <td>${item.nombre}</td>
            <td>Q${item.precio_unitario.toFixed(2)}</td>
            <td>
                <input type="number" value="${item.cantidad}" min="1" 
                    onchange="cambiarCantidad(${index}, this.value)" style="width:60px">
            </td>
            <td>Q${item.subtotal.toFixed(2)}</td>
            <td><button class="btn btn-danger" onclick="eliminarDelCarrito(${index})">X</button></td>
        </tr>
    `).join('');
    
    calcularTotales();
}

function cambiarCantidad(index, cantidad) {
    carrito[index].cantidad = parseInt(cantidad);
    carrito[index].subtotal = carrito[index].cantidad * carrito[index].precio_unitario;
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

function calcularTotales() {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const descuento = parseFloat(document.getElementById('descuentoVenta').value) || 0;
    const total = subtotal - descuento;
    
    document.getElementById('subtotalVenta').textContent = subtotal.toFixed(2);
    document.getElementById('totalVenta').textContent = total.toFixed(2);
}

document.getElementById('descuentoVenta').addEventListener('input', calcularTotales);

// ============================================
// VENTAS - PROCESAR VENTA
// ============================================
document.getElementById('btnProcesarVenta').addEventListener('click', () => {
    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    
    const total = parseFloat(document.getElementById('totalVenta').textContent);
    document.getElementById('totalPagar').textContent = total.toFixed(2);
    document.getElementById('modalPago').style.display = 'block';
    document.getElementById('montoRecibido').value = '';
    document.getElementById('cambioVenta').textContent = '0.00';
    document.getElementById('montoRecibido').focus();
});

document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('modalPago').style.display = 'none';
});

document.getElementById('montoRecibido').addEventListener('input', (e) => {
    const total = parseFloat(document.getElementById('totalPagar').textContent);
    const recibido = parseFloat(e.target.value) || 0;
    const cambio = recibido - total;
    document.getElementById('cambioVenta').textContent = cambio >= 0 ? cambio.toFixed(2) : '0.00';
});

document.getElementById('btnConfirmarPago').addEventListener('click', async () => {
    const total = parseFloat(document.getElementById('totalPagar').textContent);
    const montoRecibido = parseFloat(document.getElementById('montoRecibido').value);
    
    if (!montoRecibido || montoRecibido < total) {
        alert('El monto recibido es insuficiente');
        return;
    }
    
    const subtotal = parseFloat(document.getElementById('subtotalVenta').textContent);
    const descuento = parseFloat(document.getElementById('descuentoVenta').value) || 0;
    
    try {
        const response = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente_id: 1,
                productos: carrito,
                subtotal: subtotal,
                descuento: descuento,
                total: total,
                monto_recibido: montoRecibido,
                usuario_id: usuarioActual.id
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✅ Venta registrada exitosamente\n\nFactura: ${data.numero_factura}\nCambio: Q${data.cambio.toFixed(2)}`);
            carrito = [];
            actualizarCarrito();
            document.getElementById('modalPago').style.display = 'none';
            document.getElementById('descuentoVenta').value = 0;
            document.getElementById('buscarProducto').value = '';
            document.getElementById('resultadosProductos').innerHTML = '';
            verificarEstadoCaja();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar la venta');
    }
});

// ============================================
// PRODUCTOS
// ============================================
async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const productos = await response.json();
        
        const tbody = document.querySelector('#tablaProductos tbody');
        tbody.innerHTML = productos.map(p => `
            <tr>
                <td>${p.codigo}</td>
                <td>${p.nombre}</td>
                <td>${p.categoria_nombre || 'N/A'}</td>
                <td>Q${parseFloat(p.precio_compra).toFixed(2)}</td>
                <td>Q${parseFloat(p.precio_venta).toFixed(2)}</td>
                <td>${p.stock_actual}</td>
                <td>
                    <button class="btn btn-info" onclick="editarProducto(${p.id})">Editar</button>
                    <button class="btn btn-danger" onclick="eliminarProducto(${p.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('btnNuevoProducto').addEventListener('click', () => {
    const codigo = prompt('Código del producto:');
    if (!codigo) return;
    
    const nombre = prompt('Nombre del producto:');
    if (!nombre) return;
    
    const precio_compra = prompt('Precio de compra:');
    if (!precio_compra) return;
    
    const precio_venta = prompt('Precio de venta:');
    if (!precio_venta) return;
    
    fetch(`${API_URL}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            codigo, 
            nombre, 
            precio_compra: parseFloat(precio_compra), 
            precio_venta: parseFloat(precio_venta),
            categoria_id: 7,
            descripcion: '',
            stock_minimo: 5
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.id) {
            alert('Producto creado exitosamente');
            cargarProductos();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al crear el producto');
    });
});

function editarProducto(id) {
    alert('Función de edición en desarrollo');
}

function eliminarProducto(id) {
    if (confirm('¿Está seguro de eliminar este producto?')) {
        fetch(`${API_URL}/productos/${id}`, {
            method: 'DELETE'
        })
        .then(() => {
            alert('Producto eliminado');
            cargarProductos();
        });
    }
}

// ============================================
// INVENTARIO
// ============================================
async function cargarInventario() {
    try {
        const response = await fetch(`${API_URL}/inventario/bajo-stock`);
        const productos = await response.json();
        
        const tbody = document.querySelector('#tablaBajoStock tbody');
        tbody.innerHTML = productos.map(p => `
            <tr style="background: ${p.stock_actual === 0 ? '#ffcccc' : '#ffffcc'}">
                <td>${p.codigo}</td>
                <td>${p.nombre}</td>
                <td><strong>${p.stock_actual}</strong></td>
                <td>${p.stock_minimo}</td>
            </tr>
        `).join('');
        
        const responseMovimientos = await fetch(`${API_URL}/inventario/movimientos`);
        const movimientos = await responseMovimientos.json();
        
        const tbodyMov = document.querySelector('#tablaMovimientos tbody');
        tbodyMov.innerHTML = movimientos.map(m => `
            <tr>
                <td>${new Date(m.fecha_movimiento).toLocaleString()}</td>
                <td>${m.producto_nombre}</td>
                <td><span class="badge badge-${m.tipo_movimiento === 'entrada' ? 'cajero' : 'admin'}">${m.tipo_movimiento.toUpperCase()}</span></td>
                <td>${m.cantidad}</td>
                <td>${m.motivo}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// PROVEEDORES
// ============================================
async function cargarProveedores() {
    try {
        const response = await fetch(`${API_URL}/proveedores`);
        const proveedores = await response.json();
        
        const tbody = document.querySelector('#tablaProveedores tbody');
        tbody.innerHTML = proveedores.map(p => `
            <tr>
                <td>${p.nombre}</td>
                <td>${p.contacto || 'N/A'}</td>
                <td>${p.telefono || 'N/A'}</td>
                <td>${p.nit || 'N/A'}</td>
                <td>
                    <button class="btn btn-info" onclick="verCuadreProveedor(${p.id})">Ver Cuadre</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('btnNuevoProveedor').addEventListener('click', () => {
    const nombre = prompt('Nombre del proveedor:');
    if (!nombre) return;
    
    const telefono = prompt('Teléfono:');
    const nit = prompt('NIT:');
    
    fetch(`${API_URL}/proveedores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, nit })
    })
    .then(() => {
        alert('Proveedor creado');
        cargarProveedores();
    });
});

function verCuadreProveedor(id) {
    alert('Ver cuadre del proveedor (función en desarrollo)');
}

// ============================================
// GASTOS
// ============================================
async function cargarGastos() {
    try {
        const response = await fetch(`${API_URL}/gastos`);
        const gastos = await response.json();
        
        const tbody = document.querySelector('#tablaGastos tbody');
        tbody.innerHTML = gastos.map(g => `
            <tr>
                <td>${new Date(g.fecha_gasto).toLocaleString()}</td>
                <td>${g.descripcion}</td>
                <td>${g.categoria}</td>
                <td>Q${parseFloat(g.monto).toFixed(2)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('btnNuevoGasto').addEventListener('click', () => {
    const descripcion = prompt('Descripción del gasto:');
    if (!descripcion) return;
    
    const monto = prompt('Monto:');
    if (!monto) return;
    
    fetch(`${API_URL}/gastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            descripcion, 
            monto: parseFloat(monto), 
            categoria: 'otros', 
            usuario_id: usuarioActual.id
        })
    })
    .then(() => {
        alert('Gasto registrado');
        cargarGastos();
        verificarEstadoCaja();
    });
});

// ============================================
// LOTES
// ============================================
async function cargarLotes() {
    try {
        const response = await fetch(`${API_URL}/lotes/vencimientos`);
        const lotes = await response.json();
        
        const tbody = document.querySelector('#tablaLotesVencer tbody');
        tbody.innerHTML = lotes.map(l => {
            const diasRestantes = Math.ceil((new Date(l.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
            return `
                <tr style="background: ${diasRestantes <= 7 ? '#ffcccc' : '#ffffcc'}">
                    <td>${l.producto_nombre}</td>
                    <td>${l.numero_lote}</td>
                    <td>${l.cantidad}</td>
                    <td>${new Date(l.fecha_vencimiento).toLocaleDateString()}</td>
                    <td><strong>${diasRestantes} días</strong></td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// REPORTES
// ============================================
async function cargarReportes() {
    alert('Sección de reportes en desarrollo');
}

// ============================================
// USUARIOS (SOLO ADMIN)
// ============================================
async function cargarUsuarios() {
    try {
        const response = await fetch(`${API_URL}/usuarios`);
        const usuarios = await response.json();
        
        const tbody = document.querySelector('#tablaUsuarios tbody');
        tbody.innerHTML = usuarios.map(u => `
            <tr>
                <td>${u.nombre}</td>
                <td>${u.email}</td>
                <td><span class="badge badge-${u.rol === 'admin' ? 'admin' : 'cajero'}">${u.rol.toUpperCase()}</span></td>
                <td>${u.activo ? ' Activo' : ' Inactivo'}</td>
                <td>${new Date(u.fecha_creacion).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-warning" onclick="cambiarPasswordUsuario(${u.id})">Cambiar Contraseña</button>
                    ${u.activo ? 
                        `<button class="btn btn-danger" onclick="desactivarUsuario(${u.id})">Desactivar</button>` :
                        `<button class="btn btn-success" onclick="activarUsuario(${u.id})">Activar</button>`
                    }
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('btnNuevoUsuario').addEventListener('click', () => {
    document.getElementById('modalUsuario').style.display = 'block';
});

document.querySelector('.close-usuario').addEventListener('click', () => {
    document.getElementById('modalUsuario').style.display = 'none';
});

document.getElementById('formUsuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreNuevoUsuario').value;
    const email = document.getElementById('emailNuevoUsuario').value;
    const password = document.getElementById('passwordNuevoUsuario').value;
    const rol = document.getElementById('rolNuevoUsuario').value;
    
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password, rol })
        });
        
        if (response.ok) {
            alert('Usuario creado exitosamente');
            document.getElementById('modalUsuario').style.display = 'none';
            document.getElementById('formUsuario').reset();
            cargarUsuarios();
        } else {
            const data = await response.json();
            alert('Error: ' + (data.error || 'No se pudo crear el usuario'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al crear usuario');
    }
});

async function desactivarUsuario(id) {
    if (confirm('¿Está seguro que desea desactivar este usuario?')) {
        try {
            await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
            alert('Usuario desactivado');
            cargarUsuarios();
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

async function activarUsuario(id) {
    try {
        await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: '', email: '', rol: 'cajero', activo: true })
        });
        alert('Usuario activado');
        cargarUsuarios();
    } catch (error) {
        console.error('Error:', error);
    }
}

function cambiarPasswordUsuario(id) {
    const passwordActual = prompt('Contraseña actual:');
    if (!passwordActual) return;
    
    const passwordNueva = prompt('Nueva contraseña:');
    if (!passwordNueva) return;
    
    fetch(`${API_URL}/usuarios/${id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert('Contraseña actualizada');
        } else {
            alert('Error: ' + (data.error || 'No se pudo cambiar la contraseña'));
        }
    });
}