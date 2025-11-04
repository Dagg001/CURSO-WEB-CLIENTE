/*
================================================================
📜 ÍNDICE DE FUNCIONES
================================================================

(Este es el índice completo para referencia. 
Debajo, cada subtítulo está colocado 
a fin de facilitar la navegación profe, no me pegue :( )).

###  Punto de Entrada
* document.addEventListener('DOMContentLoaded', ...)

###  Gestión del Carrito
* obtenerCarrito()
* guardarCarrito(carrito)
* agregarAlCarrito(id)
* actualizarCantidadEnCarrito(id, cantidad)
* eliminarDelCarrito(id)
* calcularTotal(carrito)

###  Renderizado de Páginas
* generarListaDeArticulos(lista)
* generarDetalleDeArticulo()
* renderCarrito()
* initFacturacion()

###  Filtros y Orden
* inicializarFiltrosYOrden()

================================================================
*/

const datosDeArticulos = [
  {
    id: "art1",
    titulo: "El libro de los hechizos",
    imgSrc: "./img/libro1.jpg",
    descripcionCorta: "Un compendio de hechizos y encantamientos para principiantes y expertos.",
    descripcionLarga: "El libro de los hechizos es un compendio práctico y accesible que reúne una amplia variedad de encantamientos, rituales y fórmulas mágicas diseñadas tanto para principiantes como para practicantes con experiencia. Su funcionamiento se basa en una guía clara y detallada, con instrucciones paso a paso que permiten comprender la esencia de cada hechizo y aplicarlo de manera sencilla en la vida cotidiana.",
    precio: 29.99,
    stock: 10
  },
  {
    id: "art2",
    titulo: "El Nombre del Viento",
    imgSrc: "./img/libro2.jpg",
    descripcionCorta: "Una colección de relatos espeluznantes y misteriosos.",
    descripcionLarga: "Sumérgete en la crónica en primera persona de Kvothe, un héroe legendario contado por él mismo. Desde su infancia en una compañía de artistas itinerantes hasta su tiempo como huérfano en una ciudad implacable y su audaz ingreso en una legendaria escuela de magia, esta es la historia de un mito viviente.",
    precio: 19.99,
    stock: 5
  },
  {
    id: "art3",
    titulo: "Crónicas del reino perdido",
    imgSrc: "./img/libro3.jpg",
    descripcionCorta: "Una saga de aventuras épicas en tierras olvidadas.",
    descripcionLarga: "Una saga épica que sigue la guerra de linajes por el trono de un reino caído. Alianzas se forjan y se rompen, mientras antiguos poderes despiertan en una tierra devastada por la traición. Héroes inesperados deberán alzarse para reclamar lo que les fue arrebatado.",
    precio: 24.50,
    stock: 12
  },
  {
    id: "art4",
    titulo: "El grimorio oscuro",
    imgSrc: "./img/libro4.jpg",
    descripcionCorta: "Secretos prohibidos y rituales ancestrales.",
    descripcionLarga: "Advertencia: este tomo no es para los débiles de corazón. Contiene los secretos prohibidos y rituales ancestrales recopilados por hechiceros oscuros a lo largo de milenios. Su poder es inmenso, pero su precio es aún mayor. Solo aquellos dispuestos a pagar el coste se atreven a abrirlo.",
    precio: 34.90,
    stock: 3
  },
  {
    id: "art5",
    titulo: "Cuentos de medianoche",
    imgSrc: "./img/libro5.jpg",
    descripcionCorta: "Relatos cortos para leer bajo la luz de la luna.",
    descripcionLarga: "Una colección de relatos góticos y misteriosos perfectos para leer bajo la luz de la luna. Cada historia explora los rincones oscuros de la naturaleza humana, lo sobrenatural y los susurros que se esconden en las sombras justo después de la medianoche.",
    precio: 14.99,
    stock: 20
  },
  {
    id: "art6",
    titulo: "El códice del viajero",
    imgSrc: "./img/libro6.jpg",
    descripcionCorta: "Mapas mágicos y aventuras en mundos lejanos.",
    descripcionLarga: "No es un libro, es el diario de un viajero interdimensional. Lleno de mapas de mundos lejanos, bocetos de criaturas imposibles y notas sobre portales mágicos ocultos. Cada página es una aventura esperando ser vivida, una guía para aquellos que buscan lo desconocido.",
    precio: 21.75,
    stock: 8
  },
  {
    id: "art7",
    titulo: "Bestiario encantado",
    imgSrc: "./img/libro7.jpg",
    descripcionCorta: "Una guía ilustrada de criaturas míticas y legendarias.",
    descripcionLarga: "La guía de campo definitiva para el naturalista mágico. Este bestiario ilustrado cataloga docenas de criaturas míticas, desde el majestuoso Grifo hasta el esquivo Kelpie. Detalla sus hábitats, dietas, habilidades mágicas y cómo interactuar con ellas (y sobrevivir para contarlo).",
    precio: 27.40,
    stock: 15
  },
  {
    id: "art8",
    titulo: "El guardián de los sueños",
    imgSrc: "./img/libro8.jpg",
    descripcionCorta: "Una historia fantástica sobre mundos oníricos.",
    descripcionLarga: "Una novela fantástica que narra la historia de Elara, una joven que descubre que tiene el poder de entrar en el Mundo Onírico. Allí, debe convertirse en una guardiana para proteger los sueños de la humanidad de las Pesadillas que buscan corromper la realidad.",
    precio: 18.60,
    stock: 7
  }
];

/*
### 🚀 Punto de Entrada
* document.addEventListener('DOMContentLoaded', ...)
*/
document.addEventListener('DOMContentLoaded', () => {

    
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
    if (contCarrito && document.location.pathname.endsWith('carrito.html')) {
        renderCarrito();
    }

    if (document.location.pathname.endsWith('facturacion.html')) {
        initFacturacion();
    }

});


const KEY_CARRITO = 'carrito_zerymnor_v1';

/*
### 🛒 Gestión del Carrito
* obtenerCarrito()
*/
function obtenerCarrito() {
  try { return JSON.parse(localStorage.getItem(KEY_CARRITO)) || []; } catch { return []; }
}

/*
### 📄 Renderizado de Páginas
* initFacturacion()
*/
function initFacturacion() {
  const params = new URLSearchParams(window.location.search);
  const buy = params.get('buy');
  const id = params.get('id');
  const totalElem = document.querySelector('form h3');
  const artInput = document.getElementById('articulo');
  if (!totalElem) return;

  if (buy === 'single' && id) {
    const art = datosDeArticulos.find(a => a.id === id);
    if (!art) return;
    if (artInput) artInput.value = `${art.titulo} x1`;
    totalElem.textContent = `Total: ${art.precio.toFixed(2)}`;
    return;
  }

  const carrito = obtenerCarrito();
  if (artInput) {
    if (!carrito.length) {
      artInput.value = 'Carrito vacío';
    } else {
      artInput.value = carrito.map(it => {
        const a = datosDeArticulos.find(x => x.id === it.id);
        return a ? `${a.titulo} x${it.cantidad}` : '';
      }).filter(Boolean).join('\n');
    }
  }
  const total = calcularTotal(carrito);
  totalElem.textContent = `Total: ${total.toFixed(2)}`;
}

/*
### 📄 Renderizado de Páginas
* renderCarrito()
*/
function renderCarrito() {
  const lista = document.querySelector('.pagina-secundaria .articulos');
  if (!lista) return;

  
  let totalWrap = document.querySelector('.pagina-secundaria .total');
  if (!totalWrap) {
    totalWrap = document.createElement('div');
    totalWrap.className = 'total';
    
    if (lista.parentElement) lista.parentElement.appendChild(totalWrap);
  }

  const carrito = obtenerCarrito();
  lista.innerHTML = '';

  if (!carrito.length) {
    const vacio = document.createElement('div');
    vacio.className = 'item-carrito';
    vacio.innerHTML = `<p style="padding:12px; font-size:18px;">No hay artículos en el carrito aún.</p>`;
    lista.appendChild(vacio);

    totalWrap.innerHTML = `<p>Total: $0.00</p><a href="facturacion.html"><button disabled>Finalizar Compra</button></a>`;
    return;
  }

  carrito.forEach(({ id, cantidad }) => {
    const art = datosDeArticulos.find(a => a.id === id);
    if (!art) return;

    const wrap = document.createElement('div');
    wrap.className = 'item-carrito';
    wrap.innerHTML = `
      <img src="${art.imgSrc}" alt="${art.titulo}">
      <div class="info">
        <h3>${art.titulo}</h3>
        <p>${art.descripcionCorta}</p>
        <p id="Precio">Precio: ${art.precio.toFixed(2)}</p>
        <p class="stock">Stock: ${art.stock}</p>
      </div>
      <button class="btn-eliminar" data-id="${id}">Eliminar</button>
      <label for="cantidad-${id}" id="cantidad-label">Cantidad:</label>
      <input id="cantidad-${id}" type="number" min="1" max="${art.stock}" value="${Math.min(cantidad, art.stock)}">
    `;
    lista.appendChild(wrap);
  });

 
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
    const carrito = obtenerCarrito();
    const total = calcularTotal(carrito);
    // Reutilizar el único contenedor de total
    const totalElem = totalWrap.querySelector('p');
    if (!totalElem) {
      totalWrap.innerHTML = `<p>Total: ${total.toFixed(2)}</p><a href="facturacion.html"><button>Finalizar Compra</button></a>`;
    } else {
      totalElem.textContent = `Total: ${total.toFixed(2)}`;
    }
  }

  actualizarTotal();
}

/*
### 🛒 Gestión del Carrito
* guardarCarrito(carrito)
*/
function guardarCarrito(carrito) {
  localStorage.setItem(KEY_CARRITO, JSON.stringify(carrito));
}

/*
### 🛒 Gestión del Carrito
* agregarAlCarrito(id)
*/
function agregarAlCarrito(id) {
  const articulo = datosDeArticulos.find(a => a.id === id);
  if (!articulo) return;
  const carrito = obtenerCarrito();
  const item = carrito.find(i => i.id === id);
  if (!item) {
    carrito.push({ id, cantidad: 1 });
    guardarCarrito(carrito);
    alert(`Añadido "${articulo.titulo}" al carrito`);
    return;
  }
  if (item.cantidad >= articulo.stock) {
    alert(`No hay más stock disponible para "${articulo.titulo}". Máximo: ${articulo.stock}`);
    return;
  }
  item.cantidad += 1;
  guardarCarrito(carrito);
  alert(`Añadido "${articulo.titulo}" al carrito (x${item.cantidad})`);
}

/*
### 🛒 Gestión del Carrito
* actualizarCantidadEnCarrito(id, cantidad)
*/
function actualizarCantidadEnCarrito(id, cantidad) {
  const carrito = obtenerCarrito();
  const item = carrito.find(i => i.id === id);
  if (!item) return;
  const art = datosDeArticulos.find(a => a.id === id);
  const max = art ? art.stock : cantidad;
  item.cantidad = Math.max(1, Math.min(max, cantidad));
  guardarCarrito(carrito);
}

/*
### 🛒 Gestión del Carrito
* eliminarDelCarrito(id)
*/
function eliminarDelCarrito(id) {
  let carrito = obtenerCarrito();
  carrito = carrito.filter(i => i.id !== id);
  guardarCarrito(carrito);
}

/*
### 🛒 Gestión del Carrito
* calcularTotal(carrito)
*/
function calcularTotal(carrito) {
  return carrito.reduce((acc, it) => {
    const art = datosDeArticulos.find(a => a.id === it.id);
    return acc + (art ? art.precio * it.cantidad : 0);
  }, 0);
}

/*
### 📄 Renderizado de Páginas
* generarListaDeArticulos(lista)
*/
function generarListaDeArticulos(lista = datosDeArticulos) {
    const contenedor = document.getElementById('lista-articulos');
    contenedor.innerHTML = '';

    lista.forEach(articulo => {
        const divArticulo = document.createElement('div');
        divArticulo.classList.add('item');
        divArticulo.dataset.titulo = articulo.titulo.toLowerCase();
        divArticulo.dataset.precio = articulo.precio;

        divArticulo.innerHTML = `
            <img src="${articulo.imgSrc}" alt="${articulo.titulo}" width="400px">
            <h3><a href="articulo.html?id=${articulo.id}">${articulo.titulo}</a></h3>
            <p>${articulo.descripcionCorta}</p>
            <p class="precio">Precio: ${articulo.precio.toFixed(2)}</p>
            <p class="stock">Stock: ${articulo.stock}</p>
            <button data-id="${articulo.id}">Añadir al carrito</button>
        `;
        contenedor.appendChild(divArticulo);
    });

    const botones = contenedor.querySelectorAll('.item button');
    botones.forEach(boton => {
        boton.addEventListener('click', () => {
            const id = boton.getAttribute('data-id');
            agregarAlCarrito(id);
        });
    });
}

/*
### 🔍 Filtros y Orden
* inicializarFiltrosYOrden()
*/
function inicializarFiltrosYOrden() {
    const inputFiltro = document.getElementById('filtro-input');
    const selOrdenPrecio = document.getElementById('orden-precio');
    const selOrdenNombre = document.getElementById('orden-nombre');

    let termino = '';
    let criterioOrden = '';

    function aplicar() {
        
        let resultado = datosDeArticulos.filter(a =>
            a.titulo.toLowerCase().includes(termino)
        );

        
        switch (criterioOrden) {
            case 'precio-asc':
                resultado.sort((a,b) => a.precio - b.precio);
                break;
            case 'precio-desc':
                resultado.sort((a,b) => b.precio - a.precio);
                break;
            case 'nombre-asc':
                resultado.sort((a,b) => a.titulo.localeCompare(b.titulo));
                break;
            case 'nombre-desc':
                resultado.sort((a,b) => b.titulo.localeCompare(a.titulo));
                break;
            default:
                
                break;
        }

        generarListaDeArticulos(resultado);
    }

    if (inputFiltro) {
        inputFiltro.addEventListener('input', e => {
            termino = e.target.value.trim().toLowerCase();
            aplicar();
        });
    }

    function actualizarOrden() {
        const vPrecio = selOrdenPrecio ? selOrdenPrecio.value : '';
        const vNombre = selOrdenNombre ? selOrdenNombre.value : '';

        criterioOrden = vPrecio || vNombre;
        aplicar();
    }

    if (selOrdenPrecio) selOrdenPrecio.addEventListener('change', () => {
       
        if (selOrdenNombre) selOrdenNombre.value = '';
        actualizarOrden();
    });

    if (selOrdenNombre) selOrdenNombre.addEventListener('change', () => {
        
        if (selOrdenPrecio) selOrdenPrecio.value = '';
        actualizarOrden();
    });
}


/*
### 📄 Renderizado de Páginas
* generarDetalleDeArticulo()
*/
function generarDetalleDeArticulo() {
    
    const params = new URLSearchParams(window.location.search);
    const idArticulo = params.get('id'); 
    
    const articulo = datosDeArticulos.find(item => item.id === idArticulo);

   
    const contenedor = document.getElementById('detalle-articulo');

   
    if (articulo) {
        
        document.title = `Zerymnor - ${articulo.titulo}`;
        
       
        contenedor.innerHTML = `
            <img src="${articulo.imgSrc}" alt="${articulo.titulo}">
            <h3>${articulo.titulo}</h3>
            <p>${articulo.descripcionLarga}</p>
            <p class="precio">Precio: ${articulo.precio}</p>
            <p class="stock">Stock: ${articulo.stock} unidades disponibles!</p>
            <button class="btn-agregar" data-id="${articulo.id}">Añadir al carrito</button>
            <a href="facturacion.html?buy=single&id=${articulo.id}"><button class="btn-comprar">Comprar ahora</button></a>
        `;

        
        const botonAgregar = contenedor.querySelector('.btn-agregar');
        botonAgregar.replaceWith(botonAgregar.cloneNode(true));
        const btn = contenedor.querySelector('.btn-agregar');
        btn.addEventListener('click', () => {
             agregarAlCarrito(articulo.id);
        }, { once: true });

    } else {
      
        contenedor.innerHTML = "<h3>Error: Artículo no encontrado.</h3><p><a href='index.html'>Volver al inicio</a></p>";
    }
}