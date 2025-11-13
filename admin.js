import { AIRTABLE_TOKEN, BASE_ID, TABLE_NAME } from './env.js';

const airtableToken = AIRTABLE_TOKEN;
const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

const adminListEl = document.getElementById ? document.getElementById('admin-list') : null;

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
const candidates = fields.imgSrc || fields.imagen || fields.imagenes || fields.image || fields.images || fields.img || fields.Attachments || fields.attachments;  if (Array.isArray(candidates) && candidates.length) {
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
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderList(records) {
  if (!adminListEl) return;

  // Limpiar la lista
  adminListEl.innerHTML = ''; 

  if (!records.length) {
    // Usar un <li> para el mensaje de "no hay artículos"
    adminListEl.innerHTML = '<li class="admin-list-empty">No hay artículos.</li>';
    return;
  }

  // Iterar sobre los registros y crear un <li> para cada uno
  records.forEach(rec => {
    const f = rec.fields || {};
    const id = rec.id; // El ID se sigue usando para los botones, pero no se muestra
    const title = f.titulo || f.Title || f.name || '';
    const precio = Number(f.precio ?? f.price ?? 0).toFixed(2);
    const stock = safeParseInt(f.stock ?? f.Stock ?? 0, 0);
    const imgUrl = getImageUrl(f) || './img/placeholder.png';
    const isExternal = /^https?:\/\//i.test(imgUrl);

    const li = document.createElement('li');
    li.className = 'admin-list-item'; // Clase para el nuevo CSS

    // Estructura interna del <li>
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

  // Volver a adjuntar los listeners a los botones recién creados
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
  try {
    const url = `${airtableUrl}/${id}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${airtableToken}` } });
    if (!res.ok) throw new Error('Fetch record failed ' + res.status);
    const json = await res.json();
    const fields = json.fields || {};
    const nuevoTitulo = prompt('Título:', fields.titulo || fields.Title || '');
    if (nuevoTitulo === null) return;
    const nuevoPrecioRaw = prompt('Precio (ej. 12.50):', String(fields.precio ?? fields.price ?? '0'));
    if (nuevoPrecioRaw === null) return;
    const nuevoStockRaw = prompt('Stock (número entero):', String(fields.stock ?? fields.Stock ?? '0'));
    if (nuevoStockRaw === null) return;

    const body = { fields: {} };
    body.fields.titulo = nuevoTitulo;
    if (!isNaN(Number(nuevoPrecioRaw))) body.fields.precio = Number(nuevoPrecioRaw);
    if (!isNaN(Number(nuevoStockRaw))) body.fields.stock = Number(nuevoStockRaw);

    const patchRes = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${airtableToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!patchRes.ok) {
      const j = await patchRes.json().catch(()=>null);
      throw new Error('Update failed ' + patchRes.status + (j ? ': ' + JSON.stringify(j) : ''));
    }
    await loadAndRender();
    alert('Actualizado.');
  } catch (err) {
    console.error(err);
    alert('No se pudo editar: ' + err.message);
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

const form = document.getElementById('form-crear-articulo');
if (form) {
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const titulo = form.querySelector('#articulo-titulo')?.value?.trim();
    const descripcionCorta = form.querySelector('#articulo-descripcion-corta')?.value?.trim();
    const descripcionLarga = form.querySelector('#articulo-descripcion-larga')?.value?.trim();
    const precio = Number(form.querySelector('#articulo-precio')?.value || 0);
    const stock = safeParseInt(form.querySelector('#articulo-stock')?.value || 0, 0);
    const imagen = form.querySelector('#articulo-imagen')?.value?.trim();

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
        const j = await res.json().catch(()=>null);
        throw new Error('Create failed ' + res.status + (j ? ': ' + JSON.stringify(j) : ''));
      }
      form.reset();
      await loadAndRender();
      alert('Artículo creado.');
    } catch (err) {
      console.error(err);
      alert('No se pudo crear: ' + err.message);
    }
  });
}

loadAndRender();