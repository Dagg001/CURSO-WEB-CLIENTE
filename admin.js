/*
========================================
 ÍNDICE DE SCRIPT (admin.js)
========================================

 1. CONFIGURACIÓN E IMPORTACIONES
    - Constantes de Airtable

 2. ESTADO GLOBAL Y SELECTORES DOM
    - Variables globales (p.ej. `currentEditRecordId`)
    - Selectores de elementos del DOM (formularios, modales, etc.)

 3. FUNCIONES HELPERS (Utilidades)
    - `safeParseInt`
    - `findAttachmentUrl`, `getImageUrl` (Airtable helpers)
    - `escapeHtml`

 4. LÓGICA DE DATOS (FETCH Y RENDER)
    - `fetchRecords` (GET de todos los artículos)
    - `renderList` (Dibuja la lista de artículos en el DOM)
    - `loadAndRender` (Coordina el fetch y el render)

 5. MANEJADORES DE ACCIONES (CRUD)
    - `onDeleteClick` (Manejador para el botón Eliminar)
    - `onEditClick` (Manejador para el botón Editar, abre el modal)

 6. INICIALIZACIÓN Y EVENT LISTENERS
    - Listener para el formulario de CREAR (POST)
    - Listener para el formulario de EDITAR (PATCH)
    - Listeners para cerrar el modal
    - Punto de entrada (Llamada inicial a `loadAndRender`)

========================================
*/

// ----------------------------------------
// 1. CONFIGURACIÓN E IMPORTACIONES
// ----------------------------------------
import { AIRTABLE_TOKEN, BASE_ID, TABLE_NAME } from './env.js';

const airtableToken = AIRTABLE_TOKEN;
const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

// ----------------------------------------
// 2. ESTADO GLOBAL Y SELECTORES DOM
// ----------------------------------------
const adminListEl = document.getElementById('admin-list');
const formCreateEl = document.getElementById('form-crear-articulo');

const modalEditEl = document.getElementById('modal-editar-articulo');
const formEditEl = document.getElementById('form-editar-articulo');
const btnCerrarModalEl = document.getElementById('btn-cerrar-modal');
let currentEditRecordId = null;

// ----------------------------------------
// 3. FUNCIONES HELPERS (Utilidades)
// ----------------------------------------
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

function getImageUrl(fields) {
  const candidates = fields.imgSrc || fields.imagen || fields.imagenes || fields.image || fields.images || fields.img || fields.Attachments || fields.attachments;
  if (Array.isArray(candidates) && candidates.length) {
    return candidates[0].url || candidates[0].thumbnails?.large?.url || candidates[0].thumbnails?.small?.url || "";
  }
  return findAttachmentUrl(fields) || '';
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ----------------------------------------
// 4. LÓGICA DE DATOS (FETCH Y RENDER)
// ----------------------------------------

/** Obtiene todos los artículos de Airtable */
async function fetchRecords() {
  const res = await fetch(airtableUrl, { headers: { Authorization: `Bearer ${airtableToken}` } });
  if (!res.ok) throw new Error('Airtable fetch error ' + res.status);
  const json = await res.json();
  return json.records || [];
}

/** Dibuja la lista de artículos en el DOM */
function renderList(records) {
  if (!adminListEl) return;
  adminListEl.innerHTML = '';

  if (!records.length) {
    adminListEl.innerHTML = '<li class="admin-list-empty">No hay artículos.</li>';
    return;
  }

  records.forEach(rec => {
    const f = rec.fields || {};
    const id = rec.id;
    const title = f.titulo || f.Title || f.name || '';
    const precio = Number(f.precio ?? f.price ?? 0).toFixed(2);
    const stock = safeParseInt(f.stock ?? f.Stock ?? 0, 0);
    const imgUrl = getImageUrl(f) || './img/placeholder.png';
    const isExternal = /^https?:\/\//i.test(imgUrl);

    const li = document.createElement('li');
    li.className = 'admin-list-item';
    li.innerHTML = `
      <img class="admin-item-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" ${isExternal ? 'crossorigin="anonymous"' : ''}>
      <div class="admin-item-info">
        <h4 class="admin-item-title">${escapeHtml(title)}</h4>
        <p class="admin-item-precio">$${precio}</p>
        <p class="admin-item-stock">Stock: ${stock}</p>
      </div>
      <div class="admin-item-actions">
        <button data-id="${id}" class="btn-edit">Editar</button>
        <button data-id="${id}" class="btn-delete">Eliminar</button>
      </div>
    `;
    adminListEl.appendChild(li);
  });

  // Asigna los listeners a los botones recién creados
  adminListEl.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', onDeleteClick));
  adminListEl.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', onEditClick));
}

/** Función coordinadora: Llama a fetchRecords y luego a renderList */
async function loadAndRender() {
  try {
    const records = await fetchRecords();
    renderList(records);
  } catch (err) {
    console.error('Error cargando lista admin:', err);
    if (adminListEl) adminListEl.innerHTML = `<p>Error cargando datos: ${escapeHtml(err.message)}</p>`;
  }
}

// ----------------------------------------
// 5. MANEJADORES DE ACCIONES (CRUD)
// ----------------------------------------

/** Maneja el clic en "Eliminar" */
async function onDeleteClick(e) {
  const id = e.target.dataset.id;
  if (!confirm('Eliminar registro?')) return;
  try {
    const url = `${airtableUrl}/${id}`;
    const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${airtableToken}` } });
    if (!res.ok) throw new Error('Delete failed ' + res.status);
    await loadAndRender();
    alert('Eliminado.');
  } catch (err) {
    console.error(err);
    alert('No se pudo eliminar: ' + err.message);
  }
}

/** Maneja el clic en "Editar" */
async function onEditClick(e) {
  const id = e.target.dataset.id;
  currentEditRecordId = id; 
  
  try {
    // 1. Obtener los datos actuales del registro
    const url = `${airtableUrl}/${id}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${airtableToken}` } });
    if (!res.ok) throw new Error('Fetch record failed ' + res.status);
    
    const json = await res.json();
    const fields = json.fields || {};

    // 2. Rellenar el formulario del modal con esos datos
    if (formEditEl) {
      formEditEl.querySelector('#edit-articulo-titulo').value = fields.titulo || '';
      formEditEl.querySelector('#edit-articulo-descripcion-corta').value = fields.descripcionCorta || '';
      formEditEl.querySelector('#edit-articulo-descripcion-larga').value = fields.descripcionLarga || '';
      formEditEl.querySelector('#edit-articulo-precio').value = fields.precio || 0;
      formEditEl.querySelector('#edit-articulo-stock').value = fields.stock || 0;
      
      const imgField = fields.imgSrc; 
      const currentImgUrl = (Array.isArray(imgField) && imgField.length > 0) ? imgField[0].url : '';
      formEditEl.querySelector('#edit-articulo-imagen').value = currentImgUrl;
    }

    // 3. Mostrar el modal
    if (modalEditEl) modalEditEl.showModal();

  } catch (err) {
    console.error(err);
    alert('No se pudo cargar el artículo: ' + err.message);
    currentEditRecordId = null;
  }
}

// ----------------------------------------
// 6. INICIALIZACIÓN Y EVENT LISTENERS
// ----------------------------------------

/** Listener para el formulario de CREAR (POST) */
if (formCreateEl) {
  formCreateEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    // 1. Obtener datos del formulario
    const titulo = formCreateEl.querySelector('#articulo-titulo')?.value?.trim();
    const descripcionCorta = formCreateEl.querySelector('#articulo-descripcion-corta')?.value?.trim();
    const descripcionLarga = formCreateEl.querySelector('#articulo-descripcion-larga')?.value?.trim();
    const precio = Number(formCreateEl.querySelector('#articulo-precio')?.value || 0);
    const stock = safeParseInt(formCreateEl.querySelector('#articulo-stock')?.value || 0, 0);
    const imagen = formCreateEl.querySelector('#articulo-imagen')?.value?.trim();

    if (!titulo) { alert('Título requerido'); return; }

    // 2. Preparar el body para Airtable
    const body = {
      fields: {
        titulo: titulo,
        descripcionCorta: descripcionCorta,
        descripcionLarga: descripcionLarga,
        precio: precio,
        stock: stock
      }
    };

    if (imagen) {
      body.fields.imgSrc = [{ url: imagen }];
    }

    // 3. Enviar a Airtable
    try {
      const res = await fetch(airtableUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${airtableToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error('Create failed ' + res.status + (j ? ': ' + JSON.stringify(j) : ''));
      }
      formCreateEl.reset();
      await loadAndRender();
      alert('Artículo creado.');
    } catch (err) {
      console.error(err);
      alert('No se pudo crear: ' + err.message);
    }
  });
}

/** Listener para el formulario de EDITAR (PATCH) */
if (formEditEl) {
  formEditEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!currentEditRecordId) {
      alert('Error: No hay un artículo seleccionado.');
      return;
    }

    // 1. Obtener datos del formulario
    const titulo = formEditEl.querySelector('#edit-articulo-titulo')?.value?.trim();
    const descripcionCorta = formEditEl.querySelector('#edit-articulo-descripcion-corta')?.value?.trim();
    const descripcionLarga = formEditEl.querySelector('#edit-articulo-descripcion-larga')?.value?.trim();
    const precio = Number(formEditEl.querySelector('#edit-articulo-precio')?.value || 0);
    const stock = safeParseInt(formEditEl.querySelector('#edit-articulo-stock')?.value || 0, 0);
    const imagen = formEditEl.querySelector('#edit-articulo-imagen')?.value?.trim();

    // 2. Preparar el body para Airtable
    const body = {
      fields: {
        titulo: titulo,
        descripcionCorta: descripcionCorta,
        descripcionLarga: descripcionLarga,
        precio: precio,
        stock: stock
      }
    };
    
    body.fields.imgSrc = imagen ? [{ url: imagen }] : null;

    // 3. Enviar a Airtable (PATCH)
    try {
      const url = `${airtableUrl}/${currentEditRecordId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${airtableToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error('Update failed ' + res.status + (j ? ': ' + JSON.stringify(j) : ''));
      }

      if (modalEditEl) modalEditEl.close(); 
      await loadAndRender(); 
      alert('¡Cambios guardados!');

    } catch (err) {
      console.error(err);
      alert('No se pudo guardar: ' + err.message);
    } finally {
      currentEditRecordId = null; 
    }
  });
}

/** Listeners para cerrar el modal */
if (btnCerrarModalEl) {
  btnCerrarModalEl.addEventListener('click', () => {
    if (modalEditEl) modalEditEl.close();
  });
}

// Cerrar el modal si se hace clic fuera de él (en el ::backdrop)
if (modalEditEl) {
    modalEditEl.addEventListener('click', (e) => {
        if (e.target === modalEditEl) {
            modalEditEl.close();
        }
    });
}

/** Punto de entrada: Cargar y renderizar la lista al iniciar */
loadAndRender();