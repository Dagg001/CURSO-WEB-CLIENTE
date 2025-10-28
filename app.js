
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

document.addEventListener('DOMContentLoaded', () => {

    
    const contenedorLista = document.getElementById('lista-articulos');
    const contenedorDetalle = document.getElementById('detalle-articulo');

    
    if (contenedorLista) {
        generarListaDeArticulos();
    }

   
    if (contenedorDetalle) {
        generarDetalleDeArticulo();
    }

});
function generarListaDeArticulos() {
    const contenedor = document.getElementById('lista-articulos');
    contenedor.innerHTML = ''; 

    datosDeArticulos.forEach(articulo => {
        const divArticulo = document.createElement('div');
        divArticulo.classList.add('item');

        // El enlace ahora apunta a 'articulo.html' y le pasa el 'id'
        // como un "parámetro de búsqueda" en la URL.
        divArticulo.innerHTML = `
            <img src="${articulo.imgSrc}" alt="${articulo.titulo}" width="400px">
            <h3><a href="articulo.html?id=${articulo.id}">${articulo.titulo}</a></h3>
            <p>${articulo.descripcionCorta}</p>
            <p>Precio: $${articulo.precio}</p>
            <button data-id="${articulo.id}">Añadir al carrito</button>
        `;
        
        contenedor.appendChild(divArticulo);
    });

    
    const botones = contenedor.querySelectorAll('.item button');
    botones.forEach(boton => {
        boton.addEventListener('click', () => {
            const titulo = boton.parentElement.querySelector('h3 a').innerText;
            alert(`¡Agregaste "${titulo}" al carrito!`);
            
        });
    });
}



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
            <p class="precio">Precio: $${articulo.precio}</p>
            <p class="stock">Stock: ${articulo.stock} unidades disponibles!</p>
            <button class="btn-agregar" data-id="${articulo.id}">Añadir al carrito</button>
            <a href="facturacion.html"><button class="btn-comprar">Comprar ahora</button></a>
        `;

        
        const botonAgregar = contenedor.querySelector('.btn-agregar');
        botonAgregar.addEventListener('click', () => {
             alert(`¡Agregaste "${articulo.titulo}" al carrito!`);
             
        });

    } else {
      
        contenedor.innerHTML = "<h3>Error: Artículo no encontrado.</h3><p><a href='index.html'>Volver al inicio</a></p>";
    }
}