/*
========================================
 ÍNDICE DE SCRIPT (app.js)
========================================

 1. CONFIGURACIÓN Y ESTADO GLOBAL
    - Constantes de Airtable y LocalStorage
    - Caché de artículos (`datosDeArticulos`)

 2. FUNCIONES HELPERS (Utilidades)
    - `safeParseFloat`, `safeParseInt`
    - `findAttachmentUrl` (Airtable helper)
    - `mostrarNotificacion` (Toast)

 3. LÓGICA DE AIRTABLE (API)
    - `recordToArticulo` (Transformación de datos)
    - `cargarDatosDesdeAirtable` (GET Artículos)
    - `actualizarStockEnAirtable` (PATCH Stock)
    - `guardarPedidoEnAirtable` (POST Pedido)

 4. LÓGICA DEL CARRITO (LocalStorage)
    - `obtenerCarrito`, `guardarCarrito`
    - `agregarAlCarrito`
    - `actualizarCantidadEnCarrito`
    - `eliminarDelCarrito`
    - `agruparCarritoIds`
    - `calcularTotalDesdeIds`
    - `eliminarOcurrenciasDelCarritoProcesadas`

 5. LÓGICA DE COMPRA (Coordinación)
    - `procesarCompraPara` (Verifica stock y llama a PATCH)
    - `finalizarCompraYSincronizar` (Orquesta el proceso)

 6. RENDERIZADO Y LÓGICA DE PÁGINAS
    - 6.1. Página Principal (index.html)
        - `generarListaDeArticulos`
        - `inicializarFiltrosYOrden`
    - 6.2. Página de Detalle (articulo.html)
        - `generarDetalleDeArticulo`
    - 6.3. Página de Carrito (carrito.html)
        - `renderCarrito`
    - 6.4. Página de Facturación (facturacion.html)
        - `initFacturacion`
        - `validarFormularioFacturacion`
        - `bindFormularioFacturacion`

 7. MANEJADORES DE EVENTOS Y PUNTO DE ENTRADA
    - `initDelegatedHandlers` (Delegación de eventos global)
    - EventListener: `DOMContentLoaded` (Punto de entrada)

========================================
*/

// ----------------------------------------
// 1. CONFIGURACIÓN Y ESTADO GLOBAL
// ----------------------------------------
import { AIRTABLE_TOKEN, BASE_ID, TABLE_NAME, TABLE_PEDIDOS_NAME } from './env.js';

const airtableToken = AIRTABLE_TOKEN;
const baseId = BASE_ID;
const tableName = TABLE_NAME;
const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

let datosDeArticulos = [];
const KEY_CARRITO = 'carrito_zerymnor_v1';


// ----------------------------------------
// 2. FUNCIONES HELPERS (Utilidades)
// ----------------------------------------
function safeParseFloat(v, fallback = 0) { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; }
function safeParseInt(v, fallback = 0) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : fallback; }

function findAttachmentUrl(fields) {
  for (const k in fields) {
    const v = fields[k];
    if (Array.isArray(v) && v.length) {
      const first = v[0];
      if (first && (first.url || first.thumbnails)) {
        return first.url || first.thumbnails?.large?.url || first.thumbnails?.small?.url || "";
      }
    }
  }
  return "";
}

let toastTimer; // Variable global para controlar el tiempo de la notificación

/**
 * Muestra una notificación toast en la pantalla.
 * @param {string} mensaje - El texto a mostrar.
 * @param {number} [duracion=3000] - Duración en milisegundos (default: 3 segundos).
 */
function mostrarNotificacion(mensaje, duracion = 3000) {
  const notificacion = document.getElementById('notificacion-toast');
  if (!notificacion) return; // No hacer nada si el elemento no existe

  // Poner el mensaje y mostrar
  notificacion.textContent = mensaje;
  notificacion.classList.add('toast-mostrando');

  // Limpiar cualquier temporizador anterior
  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  // Configurar temporizador para ocultarlo
  toastTimer = setTimeout(() => {
    notificacion.classList.remove('toast-mostrando');
  }, duracion);
}


// ----------------------------------------
// 3. LÓGICA DE AIRTABLE (API)
// ----------------------------------------

/** Convierte un record de Airtable a nuestro objeto Articulo */
function recordToArticulo(rec) {
  const f = rec.fields || {};
  const titulo = f.titulo || f.Titulo || f.title || f.Name || f.nombre || "Sin título";
  const descripcionCorta = f.descripcionCorta || f.descripcion || f.Descripcion || f.desc || "";
  const descripcionLarga = f.descripcionLarga || f.descripcion_larga || f.larga || descripcionCorta;
  const precio = safeParseFloat(f.precio ?? f.Precio ?? f.price ?? f.Price, 0);
  const stock = safeParseInt(f.stock ?? f.Stock ?? f.StockAvailable ?? 0, 0); // Lee de múltiples campos

  let imgSrc = "";
  const attachCandidates = f.imagen || f.imagenes || f.image || f.images || f.img || f.Attachments || f.attachments;
  if (Array.isArray(attachCandidates) && attachCandidates.length) {
    imgSrc = attachCandidates[0].url || attachCandidates[0].thumbnails?.large?.url || attachCandidates[0].thumbnails?.small?.url || "";
  }
  if (!imgSrc) imgSrc = findAttachmentUrl(f);
  if (!imgSrc) imgSrc = "./img/placeholder.png";

  return {
    id: rec.id,
    titulo,
    imgSrc,
    descripcionCorta,
    descripcionLarga,
    precio,
    stock
  };
}

/** Carga todos los artículos de Airtable y los guarda en `datosDeArticulos` */
function cargarDatosDesdeAirtable() {
  return fetch(airtableUrl, { headers: { Authorization: `Bearer ${airtableToken}` } })
    .then(res => {
      if (!res.ok) throw new Error(`Airtable error ${res.status}`);
      return res.json();
    })
    .then(data => {
      const records = data.records || [];
      datosDeArticulos = records.map(recordToArticulo);
    })
    .catch(err => {
      console.error("Error cargando Airtable:", err);
      datosDeArticulos = datosDeArticulos || [];
    });
}

/** Actualiza el stock de un item (PATCH) */
function actualizarStockEnAirtable(recordId, nuevoStock, fieldName) {
  const url = `${airtableUrl}/${recordId}`;
  const headers = {
    'Authorization': `Bearer ${airtableToken}`,
    'Content-Type': 'application/json'
  };

  // Usamos el fieldName exacto que encontramos durante la lectura
  const body = { fields: { [fieldName]: Number(nuevoStock) } };
  
  return fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) })
    .then(res => {
      if (!res.ok) {
        // Intentar obtener más detalles del error de Airtable
        return res.json().then(j => {
          const err = new Error(`Airtable update error ${res.status} al actualizar campo ${fieldName}`);
          err.detail = j;
          throw err;
        }).catch(() => {
           const err = new Error(`Airtable update error ${res.status} (sin detalle JSON)`);
           throw err;
        });
      }
      return res.json();
    })
    .catch(err => {
      // Nos aseguramos de relanzar el error para que la cadena de promesa principal falle
      console.error('No se pudo actualizar stock en Airtable:', err);
      throw err; 
    });
}

/** Guarda un registro del pedido en la tabla de Pedidos (POST) */
function guardarPedidoEnAirtable(nombre, email, direccion, articulosStr, total) {
  const url = `https://api.airtable.com/v0/${baseId}/${TABLE_PEDIDOS_NAME}`;
  
  const body = {
    fields: {
      Nombre: nombre,
      Email: email,
      Direccion: direccion,
      ArticulosComprados: articulosStr,
      TotalPagado: total
    }
  };

  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${airtableToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  .then(res => {
    if (!res.ok) {
       // Si falla, obtenemos detalles y lanzamos un error
       return res.json().then(errorDetalle => {
           console.error('Detalle del error de Airtable (Pedidos):', errorDetalle);
           throw new Error(`Error al guardar el pedido en Airtable (${res.status}). Detalles: ${JSON.stringify(errorDetalle)}`);
       }).catch(() => {
           throw new Error(`Error al guardar el pedido en Airtable (${res.status}). No se pudo obtener detalle.`);
       });
    }
    console.log('Registro de pedido guardado en Airtable.');
    return res.json();
  })
  .catch(err => {
    console.error(err);
    // Relanzamos el error para que la cadena de promesa principal lo atrape
    throw err; 
  });
}


// ----------------------------------------
// 4. LÓGICA DEL CARRITO (LocalStorage)
// ----------------------------------------

/** Obtiene el array de IDs de artículos del LocalStorage */
function obtenerCarrito() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY_CARRITO));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Guarda el array de IDs de artículos en el LocalStorage */
function guardarCarrito(idsArray) {
  localStorage.setItem(KEY_CARRITO, JSON.stringify(idsArray || []));
}

/** Añade un ID de artículo al carrito */
function agregarAlCarrito(id) {
  const articulo = datosDeArticulos.find(a => a.id === id);
  if (!articulo) { 
    mostrarNotificacion("Artículo no disponible."); // <-- CAMBIADO
    return; 
  }
  const ids = obtenerCarrito();
  const cantidadActual = ids.filter(x => x === id).length;
  if (cantidadActual >= articulo.stock) {
    mostrarNotificacion(`No hay más stock para "${articulo.titulo}". Máximo: ${articulo.stock}`); // <-- CAMBIADO
    return;
  }
  ids.push(id);
  guardarCarrito(ids);
  mostrarNotificacion(`Añadido "${articulo.titulo}" al carrito (x${cantidadActual + 1})`); // <-- CAMBIADO
}

/** Actualiza la cantidad de un item (borra todas sus instancias y añade 'cantidad' nuevas) */
function actualizarCantidadEnCarrito(id, cantidad) {
  cantidad = Math.max(1, Math.floor(Number(cantidad) || 1));
  const articulo = datosDeArticulos.find(a => a.id === id);
  if (articulo) cantidad = Math.min(cantidad, articulo.stock);
  let ids = obtenerCarrito();
  ids = ids.filter(x => x !== id);
  for (let i = 0; i < cantidad; i++) ids.push(id);
  guardarCarrito(ids);
}

/** Elimina todas las instancias de un ID de artículo del carrito */
function eliminarDelCarrito(id) {
  let ids = obtenerCarrito();
  ids = ids.filter(x => x !== id);
  guardarCarrito(ids);
}

/** Convierte el array de IDs [id1, id1, id2] a un array de objetos [{id: id1, cantidad: 2}, {id: id2, cantidad: 1}] */
function agruparCarritoIds(idsArray) {
  const map = {};
  idsArray.forEach(id => { map[id] = (map[id] || 0) + 1; });
  return Object.keys(map).map(id => ({ id, cantidad: map[id] }));
}

/** Calcula el precio total del carrito a partir del array de IDs */
function calcularTotalDesdeIds(idsArray) {
  const agrupado = agruparCarritoIds(idsArray);
  return agrupado.reduce((acc, it) => {
    const art = datosDeArticulos.find(a => a.id === it.id);
    return acc + (art ? art.precio * it.cantidad : 0);
  }, 0);
}

/** Elimina del LocalStorage los items que ya fueron procesados en una compra */
function eliminarOcurrenciasDelCarritoProcesadas(items) {
  let ids = obtenerCarrito();
  if (!ids.length) return;
  items.forEach(it => {
    let toRemove = it.cantidad;
    ids = ids.filter(id => {
      if (id === it.id && toRemove > 0) { toRemove--; return false; }
      return true;
    });
  });
  guardarCarrito(ids);
}


// ----------------------------------------
// 5. LÓGICA DE COMPRA (Coordinación)
// ----------------------------------------

/**
 * Recibe un array de items agrupados [{id, cantidad}]
 * Verifica el stock real en Airtable (doble chequeo) y lo actualiza.
 * Devuelve una Promesa que resuelve si todo sale bien, o rechaza si falla.
 */
function procesarCompraPara(items) {
  if (!Array.isArray(items) || !items.length) return Promise.reject(new Error('No hay artículos a procesar'));

  const promesas = items.map(item => {
    const recordUrl = `${airtableUrl}/${item.id}`;
    return fetch(recordUrl, { headers: { 'Authorization': `Bearer ${airtableToken}` } })
      .then(res => {
        if (!res.ok) throw new Error(`Airtable fetch error ${res.status}`);
        return res.json();
      })
      .then(record => {
        const fields = record.fields || {};

        // --- Lógica mejorada para encontrar el campo de stock ---
        let stockFieldName = null;
        let currentStock = 0;

        if (fields.stock !== undefined) {
            stockFieldName = 'stock';
            currentStock = safeParseInt(fields.stock, 0);
        } else if (fields.Stock !== undefined) {
            stockFieldName = 'Stock';
            currentStock = safeParseInt(fields.Stock, 0);
        } else if (fields.StockAvailable !== undefined) {
            stockFieldName = 'StockAvailable';
            currentStock = safeParseInt(fields.StockAvailable, 0);
        }

        if (stockFieldName === null) {
            // Si no encontramos ningún campo de stock conocido, fallamos
            throw new Error(`No se encontró un campo de stock ('stock', 'Stock', 'StockAvailable') para el item ${item.id} en Airtable.`);
        }
        // --- Fin de la lógica mejorada ---

        const art = datosDeArticulos.find(a => a.id === item.id);
        const referenciaStock = (art && Number.isFinite(art.stock)) ? art.stock : currentStock;
        const efectivoStock = Math.min(currentStock, referenciaStock);

        if (efectivoStock < item.cantidad) {
          throw new Error(`Stock insuficiente para "${(art && art.titulo) || item.id}". Disponible: ${efectivoStock}, pedido: ${item.cantidad}`);
        }
        const nuevoStock = efectivoStock - item.cantidad;
        
        // Pasamos el nombre del campo exacto a la función de actualización
        return actualizarStockEnAirtable(item.id, nuevoStock, stockFieldName)
          .then(resRecord => {
            if (art) art.stock = nuevoStock;
            return resRecord;
          });
      });
  });

  return Promise.all(promesas);
}

/**
 * Orquesta el proceso de compra:
 * 1. Procesa y actualiza el stock en Airtable.
 * 2. Si tiene éxito, elimina los items del carrito local.
 * 3. Lanza un error si algo falla.
 */
function finalizarCompraYSincronizar(itemsArray) {
  const itemsToProcess = Array.isArray(itemsArray) && itemsArray.length
    ? itemsArray
    : agruparCarritoIds(obtenerCarrito());

  if (!itemsToProcess.length) return Promise.reject(new Error('Carrito vacío'));

 return procesarCompraPara(itemsToProcess)
  .then(() => {
    eliminarOcurrenciasDelCarritoProcesadas(itemsToProcess);
    
  })
  .catch(err => {
      console.error('Error al procesar compra:', err);
      throw err;
    });
}


// ----------------------------------------
// 6. RENDERIZADO Y LÓGICA DE PÁGINAS
// ----------------------------------------

// --- 6.1. Página Principal (index.html) ---

/** Dibuja la cuadrícula de artículos en index.html */
function generarListaDeArticulos(lista = datosDeArticulos) {
  const contenedor = document.getElementById('lista-articulos');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  lista.forEach(articulo => {
    const div = document.createElement('div');
    div.className = 'item';
    div.dataset.titulo = articulo.titulo.toLowerCase();
    div.dataset.precio = articulo.precio;
    const isExternal = /^https?:\/\//i.test(articulo.imgSrc);
    div.innerHTML = `
      <img src="${articulo.imgSrc}" alt="${articulo.titulo}" ${isExternal ? 'crossorigin="anonymous"' : ''} loading="lazy">
      <h3><a href="articulo.html?id=${articulo.id}">${articulo.titulo}</a></h3>
      <p>${articulo.descripcionCorta}</p>
      <p class="precio">Precio: ${articulo.precio.toFixed(2)}</p>
      <p class="stock">Stock: ${articulo.stock}</p>
      <button data-id="${articulo.id}">Añadir al carrito</button>
    `;
    contenedor.appendChild(div);
  });
}

/** Asigna los eventos a los inputs de filtro y orden en index.html */
function inicializarFiltrosYOrden() {
  const inputFiltro = document.getElementById('filtro-input');
  const selOrdenPrecio = document.getElementById('orden-precio');
  const selOrdenNombre = document.getElementById('orden-nombre');
  let termino = '', criterioOrden = '';

  function aplicar() {
    let resultado = datosDeArticulos.filter(a => a.titulo.toLowerCase().includes(termino));
    switch (criterioOrden) {
      case 'precio-asc': resultado.sort((a,b)=>a.precio-b.precio); break;
      case 'precio-desc': resultado.sort((a,b)=>b.precio-a.precio); break;
      case 'nombre-asc': resultado.sort((a,b)=>a.titulo.localeCompare(b.titulo)); break;
      case 'nombre-desc': resultado.sort((a,b)=>b.titulo.localeCompare(a.titulo)); break;
      default: break;
    }
    generarListaDeArticulos(resultado);
  }

  if (inputFiltro) inputFiltro.addEventListener('input', e => { termino = e.target.value.trim().toLowerCase(); aplicar(); });
  function actualizarOrden() {
    const vPrecio = selOrdenPrecio ? selOrdenPrecio.value : '';
    const vNombre = selOrdenNombre ? selOrdenNombre.value : '';
    criterioOrden = vPrecio || vNombre;
    aplicar();
  }
  if (selOrdenPrecio) selOrdenPrecio.addEventListener('change', () => { if (selOrdenNombre) selOrdenNombre.value = ''; actualizarOrden(); });
  if (selOrdenNombre) selOrdenNombre.addEventListener('change', () => { if (selOrdenPrecio) selOrdenPrecio.value = ''; actualizarOrden(); });
}

// --- 6.2. Página de Detalle (articulo.html) ---

/** Dibuja el detalle del artículo en articulo.html */
function generarDetalleDeArticulo() {
  const params = new URLSearchParams(window.location.search);
  const idArticulo = params.get('id');
  const contenedor = document.getElementById('detalle-articulo');
  if (!contenedor) return;
  const articulo = datosDeArticulos.find(i => i.id === idArticulo);
  if (!articulo) {
    contenedor.innerHTML = "<h3>Error: Artículo no encontrado.</h3><p><a href='index.html'>Volver al inicio</a></p>";
    return;
  }
  document.title = `Zerymnor - ${articulo.titulo}`;
  const isExternal = /^https?:\/\//i.test(articulo.imgSrc);
  contenedor.innerHTML = `
    <img src="${articulo.imgSrc}" alt="${articulo.titulo}" ${isExternal ? 'crossorigin="anonymous"' : ''} loading="lazy">
    <h3>${articulo.titulo}</h3>
    <p>${articulo.descripcionLarga}</p>
    <p class="precio">Precio: ${articulo.precio.toFixed(2)}</p>
    <p class="stock">Stock: ${articulo.stock} unidades disponibles!</p>
    <button class="btn-agregar" data-id="${articulo.id}">Añadir al carrito</button>
    <a href="facturacion.html?buy=single&id=${articulo.id}"><button class="btn-comprar">Comprar ahora</button></a>
  `;
  const btn = contenedor.querySelector('.btn-agregar');
  if (btn) btn.addEventListener('click', () => agregarAlCarrito(articulo.id), { once: true });
}

// --- 6.3. Página de Carrito (carrito.html) ---

/** Dibuja la lista de items y el total en carrito.html */
function renderCarrito() {
  const lista = document.querySelector('.pagina-secundaria .articulos');
  if (!lista) return;

  let totalWrap = document.querySelector('.pagina-secundaria .total');
  if (!totalWrap) {
    totalWrap = document.createElement('div');
    totalWrap.className = 'total';
    if (lista.parentElement) lista.parentElement.appendChild(totalWrap);
  }

  const ids = obtenerCarrito();
  lista.innerHTML = '';

  if (!ids.length) {
    const vacio = document.createElement('div');
    vacio.className = 'item-carrito';
    vacio.innerHTML = `<p style="padding:12px; font-size:18px;">No hay artículos en el carrito aún.</p>`;
    lista.appendChild(vacio);
    totalWrap.innerHTML = `<p>Total: $0.00</p><a href="facturacion.html"><button disabled>Finalizar Compra</button></a>`;
    return;
  }

  const agrupado = agruparCarritoIds(ids);

  agrupado.forEach(({ id, cantidad }) => {
    const art = datosDeArticulos.find(a => a.id === id);
    if (!art) return;
    const wrap = document.createElement('div');
    wrap.className = 'item-carrito';
    const isExternal = /^https?:\/\//i.test(art.imgSrc);
    wrap.innerHTML = `
      <img src="${art.imgSrc}" alt="${art.titulo}" ${isExternal ? 'crossorigin="anonymous"' : ''} loading="lazy">
      <div class="info">
        <h3>${art.titulo}</h3>
        <p>${art.descripcionCorta}</p>
        <p id="Precio">Precio unitario: ${art.precio.toFixed(2)}</p>
        <p class="stock">Stock: ${art.stock}</p>
      </div>
      <button class="btn-eliminar" data-id="${id}">Eliminar</button>
      <label for="cantidad-${id}" id="cantidad-label">Cantidad:</label>
      <input id="cantidad-${id}" type="number" min="1" max="${art.stock}" value="${cantidad}">
    `;
    lista.appendChild(wrap);
  });

  // Asigna eventos a los inputs y botones recién creados
  lista.querySelectorAll('input[type="number"]').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const id = e.target.id.replace('cantidad-','');
      const art = datosDeArticulos.find(a => a.id === id);
      const val = parseInt(e.target.value || '1', 10);
      const safe = Math.max(1, Math.min(art.stock, val));
      e.target.value = safe;
      actualizarCantidadEnCarrito(id, safe);
      actualizarTotal();
    });
  });
  lista.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      eliminarDelCarrito(id);
      renderCarrito();
    });
  });

  function actualizarTotal() {
    const idsNow = obtenerCarrito();
    const total = calcularTotalDesdeIds(idsNow);
    const totalElem = totalWrap.querySelector('p');
    if (!totalElem) {
      totalWrap.innerHTML = `<p>Total: ${total.toFixed(2)}</p><a href="facturacion.html"><button>Finalizar Compra</button></a>`;
    } else {
      totalElem.textContent = `Total: ${total.toFixed(2)}`;
    }
  }

  actualizarTotal();
}

// --- 6.4. Página de Facturación (facturacion.html) ---

/** Pre-rellena el total y la lista de artículos en facturacion.html */
function initFacturacion() {
  const params = new URLSearchParams(window.location.search);
  const buy = params.get('buy');
  const id = params.get('id');
  const totalElem = document.querySelector('form h3');
  const artInput = document.getElementById('articulo');
  if (!totalElem) return;

  // Caso 1: Compra "Comprar ahora" de un solo item
  if (buy === 'single' && id) {
    const art = datosDeArticulos.find(a => a.id === id);
    if (!art) return;
    if (artInput) artInput.value = `${art.titulo} x1`;
    totalElem.textContent = `Total: ${art.precio.toFixed(2)}`;
    return;
  }

  // Caso 2: Compra normal desde el carrito
  const ids = obtenerCarrito();
  if (artInput) {
    if (!ids.length) {
      artInput.value = 'Carrito vacío';
    } else {
      const agrupado = agruparCarritoIds(ids);
      artInput.value = agrupado.map(it => {
        const a = datosDeArticulos.find(x => x.id === it.id);
        return a ? `${a.titulo} x${it.cantidad}` : '';
      }).filter(Boolean).join('\n');
    }
  }
  const total = calcularTotalDesdeIds(ids);
  totalElem.textContent = `Total: ${total.toFixed(2)}`;
}

/** Valida los campos del formulario de facturación */
function validarFormularioFacturacion(form) {
  const nombre = form.querySelector('#nombre')?.value?.trim();
  const email = form.querySelector('#email')?.value?.trim();
  const direccion = form.querySelector('#direccion')?.value?.trim();
  const tarjeta = form.querySelector('#tarjeta')?.value?.replace(/\s+/g,'')
  const expiracion = form.querySelector('#expiracion')?.value;
  const cvv = form.querySelector('#cvv')?.value?.trim();

  if (!nombre || !email || !direccion) {
    alert('Completa tus datos personales.');
    return false;
  }
  if (!/^\d{13,19}$/.test(tarjeta)) {
    alert('Número de tarjeta inválido.');
    return false;
  }
  if (!expiracion) {
    alert('Selecciona la fecha de expiración.');
    return false;
  }
  if (!/^\d{3,4}$/.test(cvv)) {
    alert('CVV inválido.');
    return false;
  }
  return true;
}

/** Asigna el evento 'submit' al formulario de facturación */
function bindFormularioFacturacion() {
  const form = document.getElementById('factura-form');
  if (!form) return;
  const btn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validarFormularioFacturacion(form)) return;

    const params = new URLSearchParams(window.location.search);
    const buy = params.get('buy');
    const id = params.get('id');

    if (btn) {
      btn.disabled = true;
      const prevText = btn.textContent;
      btn.textContent = 'Procesando...';

      const accion = (buy === 'single' && id)
        ? finalizarCompraYSincronizar([{ id, cantidad: 1 }])
        : finalizarCompraYSincronizar();

   // Esta cadena de promesas ahora manejará los errores correctamente
   accion
    .then(() => {
      // ¡ÉXITO! El stock se actualizó.
      // Ahora, preparamos los datos para guardar el registro del pedido.
      try {
        const nombre = form.querySelector('#nombre')?.value?.trim();
        const email = form.querySelector('#email')?.value?.trim();
        const direccion = form.querySelector('#direccion')?.value?.trim();
        const articulosStr = form.querySelector('#articulo')?.value || 'N/A';
        const totalRaw = document.querySelector('form h3')?.textContent || 'Total: 0';
        const total = safeParseFloat(totalRaw.replace('Total: ', ''));
    
        // Llamamos a la función Y DEVOLVEMOS su promesa
        return guardarPedidoEnAirtable(nombre, email, direccion, articulosStr, total);
    
      } catch (err) {
        // Si la preparación SÍNCRONA falla, rechazamos la promesa
        console.error('Error al preparar los datos del pedido:', err);
        return Promise.reject(err); // Pasa el error al .catch() principal
      }
    })
    .then(() => {
      // Este .then() SÓLO se ejecuta si guardarPedidoEnAirtable tuvo éxito
      // ¡Ahora sí, redirigimos!
      window.location.href = 'compra_lista.html';
    })
    .catch(err => {
      // CUALQUIER error en la cadena (actualizar stock O guardar pedido)
      // terminará aquí y mostrará la alerta.
      console.error(err);
      alert('Error al finalizar la compra: ' + (err.message || err));
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = prevText;
      }
    });
    } else {
      // Fallback por si el botón no se encuentra (aunque no debería pasar)
      const accion = (buy === 'single' && id)
        ? finalizarCompraYSincronizar([{ id, cantidad: 1 }])
        : finalizarCompraYSincronizar();
      accion
        .then(() => { window.location.href = 'compra_lista.html'; })
        .catch(err => {
          console.error(err);
          alert('Error al finalizar la compra: ' + (err.message || err));
      });
    }
  });
}


// ----------------------------------------
// 7. MANEJADORES DE EVENTOS Y PUNTO DE ENTRADA
// ----------------------------------------

/** Asigna manejadores de eventos delegados (solo para la lista de artículos) */
function initDelegatedHandlers() {
  // Delegación SÓLO para la lista de artículos en index.html
  const lista = document.getElementById('lista-articulos');
  if (lista) {
    lista.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-id]');
      if (btn) {
        const id = btn.getAttribute('data-id');
        agregarAlCarrito(id);
        return;
      }
      const enlace = e.target.closest('a[href*="articulo.html"]');
      if (enlace) {
        // permitir navegación normal; si quieres, puedes manejar SPA aquí
        return;
      }
    });
  }

  // NOTA: Los handlers para el carrito (eliminar, cambiar cantidad)
  // NO se delegan aquí. Se adjuntan directamente en `renderCarrito`
  // porque el contenido del carrito se re-renderiza constantemente.
}

/** PUNTO DE ENTRADA PRINCIPAL */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Cargar todos los datos de Airtable primero
  cargarDatosDesdeAirtable().then(() => {
    
    // 2. Comprobar en qué página estamos y ejecutar su lógica específica
    const contenedorLista = document.getElementById('lista-articulos');
    const contenedorDetalle = document.getElementById('detalle-articulo');

    if (contenedorLista) {
      generarListaDeArticulos();
      inicializarFiltrosYOrden();
    }
    if (contenedorDetalle) {
      generarDetalleDeArticulo();
    }

    const contCarrito = document.querySelector('.pagina-secundaria .articulos');
    if (contCarrito && location.pathname.endsWith('carrito.html')) {
      renderCarrito();
    }

    if (location.pathname.endsWith('facturacion.html')) {
      initFacturacion();
      bindFormularioFacturacion();
    }

    // 3. Iniciar los manejadores de eventos delegados globales
    initDelegatedHandlers();
  });
});