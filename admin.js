import { AIRTABLE_TOKEN, BASE_ID, TABLE_NAME } from './env.js';

const airtableToken = AIRTABLE_TOKEN;
const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

const adminListEl = document.getElementById('admin-list');
const formCreateEl = document.getElementById('form-crear-articulo');


const modalEditEl = document.getElementById('modal-editar-articulo');
const formEditEl = document.getElementById('form-editar-articulo');
const btnCerrarModalEl = document.getElementById('btn-cerrar-modal');
let currentEditRecordId = null;

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

async function fetchRecords() {
  const res = await fetch(airtableUrl, { headers: { Authorization: `Bearer ${airtableToken}` } });
  if (!res.ok) throw new Error('Airtable fetch error ' + res.status);
  const json = await res.json();
  return json.records || [];
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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

  adminListEl.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', onDeleteClick));
  adminListEl.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', onEditClick));
}

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


async function onEditClick(e) {
  const id = e.target.dataset.id;
  currentEditRecordId = id; 
  
  try {

    const url = `${airtableUrl}/${id}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${airtableToken}` } });
    if (!res.ok) throw new Error('Fetch record failed ' + res.status);
    
    const json = await res.json();
    const fields = json.fields || {};

  
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


    if (modalEditEl) modalEditEl.showModal();

  } catch (err) {
    console.error(err);
    alert('No se pudo cargar el artículo: ' + err.message);
    currentEditRecordId = null;
  }
}


async function loadAndRender() {
  try {
    const records = await fetchRecords();
    renderList(records);
  } catch (err) {
    console.error('Error cargando lista admin:', err);
    if (adminListEl) adminListEl.innerHTML = `<p>Error cargando datos: ${escapeHtml(err.message)}</p>`;
  }
}


if (formCreateEl) {
  formCreateEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const titulo = formCreateEl.querySelector('#articulo-titulo')?.value?.trim();
    const descripcionCorta = formCreateEl.querySelector('#articulo-descripcion-corta')?.value?.trim();
    const descripcionLarga = formCreateEl.querySelector('#articulo-descripcion-larga')?.value?.trim();
    const precio = Number(formCreateEl.querySelector('#articulo-precio')?.value || 0);
    const stock = safeParseInt(formCreateEl.querySelector('#articulo-stock')?.value || 0, 0);
    const imagen = formCreateEl.querySelector('#articulo-imagen')?.value?.trim();

    if (!titulo) { alert('Título requerido'); return; }

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


if (formEditEl) {
  formEditEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!currentEditRecordId) {
      alert('Error: No hay un artículo seleccionado.');
      return;
    }

    
    const titulo = formEditEl.querySelector('#edit-articulo-titulo')?.value?.trim();
    const descripcionCorta = formEditEl.querySelector('#edit-articulo-descripcion-corta')?.value?.trim();
    const descripcionLarga = formEditEl.querySelector('#edit-articulo-descripcion-larga')?.value?.trim();
    const precio = Number(formEditEl.querySelector('#edit-articulo-precio')?.value || 0);
    const stock = safeParseInt(formEditEl.querySelector('#edit-articulo-stock')?.value || 0, 0);
    const imagen = formEditEl.querySelector('#edit-articulo-imagen')?.value?.trim();

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


if (btnCerrarModalEl) {
  btnCerrarModalEl.addEventListener('click', () => {
    if (modalEditEl) modalEditEl.close();
  });
}


if (modalEditEl) {
    modalEditEl.addEventListener('click', (e) => {
        if (e.target === modalEditEl) {
            modalEditEl.close();
        }
    });
}




loadAndRender();