// frontend/catalogo-productos.js
// Generador de tarjetas de productos + filtros + paginación
// Crea las tarjetas con botón "Cotizar" conectado al carrito (addToCart).

document.addEventListener("DOMContentLoaded", () => {
  // Solo correr en productos.html
  const pageTag = document.body.dataset.page;
  if (pageTag !== "productos") return;

  const productsGrid = document.getElementById("productsGrid");
  const paginationContainer = document.getElementById("productsPagination");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageNumbersContainer = document.getElementById("pageNumbers");
  const categoryCheckboxes = document.querySelectorAll(".product-filter-category");

  if (!productsGrid || !paginationContainer || !prevPageBtn || !nextPageBtn || !pageNumbersContainer) {
    return;
  }

  // 1) Catálogo de productos
  const catalog = [
    // Trabajos de herrería
    {
      id: 101,
      name: "Puertas con herrería",
      description: "Puertas metálicas personalizadas con diseño de herrería decorativa y seguridad.",
      category: "herreria",
      badge: "Herrería",
      price: 0
    },
    {
      id: 102,
      name: "Barandales para patio",
      description: "Barandales metálicos para patios y terrazas, diseñados para seguridad y estética.",
      category: "herreria",
      badge: "Herrería",
      price: 0
    },
    {
      id: 103,
      name: "Barandales para escalera",
      description: "Barandales metálicos para escaleras interiores y exteriores, con acabados resistentes.",
      category: "herreria",
      badge: "Herrería",
      price: 0
    },
    {
      id: 104,
      name: "Rejas para ventanas",
      description: "Rejas metálicas de seguridad para ventanas, adaptadas a las medidas del proyecto.",
      category: "herreria",
      badge: "Herrería",
      price: 0
    },
    {
      id: 105,
      name: "Portones con acabados de herrería",
      description: "Portones residenciales o comerciales con acabados de herrería artística y funcional.",
      category: "herreria",
      badge: "Herrería",
      price: 0
    },
    {
      id: 106,
      name: "Marcos metálicos para puertas",
      description: "Marcos metálicos reforzados para puertas de acceso, listos para recibir la hoja.",
      category: "herreria",
      badge: "Herrería",
      price: 0
    },
    {
      id: 107,
      name: "Rejas para jardín",
      description: "Rejas y cercos metálicos para delimitar y proteger jardines y áreas exteriores.",
      category: "herreria",
      badge: "Herrería",
      price: 0
    },

    // Estructuras metálicas
    {
      id: 201,
      name: "Instalación de cabrillas metálicas",
      description: "Suministro e instalación de cabrillas metálicas para techumbres ligeras.",
      category: "estructuras",
      badge: "Estructuras",
      price: 0
    },
    {
      id: 202,
      name: "Instalación de lámina para techos",
      description: "Colocación de lámina galvanizada o pintro para cubiertas y techos metálicos.",
      category: "estructuras",
      badge: "Estructuras",
      price: 0
    },
    {
      id: 203,
      name: "Escaleras metálicas de servicio",
      description: "Escaleras metálicas de tramo recto para azoteas, áreas técnicas y mantenimiento.",
      category: "estructuras",
      badge: "Estructuras",
      price: 0
    },

    // Trabajos de soldadura
    {
      id: 301,
      name: "Bases para tinacos",
      description: "Bases metálicas de alta resistencia para soporte seguro de tinacos y cisternas.",
      category: "soldadura",
      badge: "Soldadura",
      price: 1200
    },
    {
      id: 302,
      name: "Puertas sin herrería",
      description: "Puertas metálicas lisas para accesos de servicio o áreas interiores.",
      category: "soldadura",
      badge: "Soldadura",
      price: 0
    },
    {
      id: 303,
      name: "Escaleras metálicas de mano",
      description: "Escaleras metálicas de mano, diseñadas según la altura requerida.",
      category: "soldadura",
      badge: "Soldadura",
      price: 0
    },
    {
      id: 304,
      name: "Puertas de lujo",
      description: "Puertas de herrería de alto detalle con acabados finos para fachadas principales.",
      category: "soldadura",
      badge: "Soldadura",
      price: 0
    }
  ];

  const ITEMS_PER_PAGE = 9; // 3 filas x 3 columnas
  let currentPage = 1;
  let activeCategories = new Set();
  let filteredProducts = [];

  // 2) Filtro por categorías
  function computeFilteredProducts() {
    if (activeCategories.size === 0) {
      return catalog;
    }
    return catalog.filter(p => activeCategories.has(p.category));
  }

  // 3) Render de tarjetas
  function renderProducts() {
    filteredProducts = computeFilteredProducts();

    if (filteredProducts.length === 0) {
      productsGrid.innerHTML =
        '<div class="col-span-full text-center text-gray-500 text-sm py-10">' +
        "No hay productos que coincidan con los filtros seleccionados." +
        "</div>";
      paginationContainer.classList.add("hidden");
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = filteredProducts.slice(start, end);

    productsGrid.innerHTML = "";

    pageItems.forEach(product => {
      const article = document.createElement("article");
      article.className =
        "product-card bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden " +
        "group transform transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-gray-200 cursor-pointer";
      article.dataset.category = product.category;

      const priceLabel =
        product.price > 0
          ? "$" + product.price.toLocaleString("es-MX") + " MXN"
          : "A cotizar";

      article.innerHTML = `
        <div class="h-28 bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center relative">
          <span class="absolute top-3 left-3 px-3 py-1 text-[11px] tracking-wide rounded-full bg-black/50 text-gray-100 uppercase">
            ${product.badge}
          </span>
          <i class="fas fa-tools text-3xl text-gray-100 opacity-90"></i>
        </div>
        <div class="p-5 flex flex-col justify-between h-[210px]">
          <div>
            <h3 class="text-base font-semibold text-gray-800 mb-1">
              ${product.name}
            </h3>
            <p class="text-sm text-gray-600">
              ${product.description}
            </p>
          </div>
          <div class="mt-4 flex items-center justify-between">
            <span class="text-sm font-medium text-gray-800">
              ${priceLabel}
            </span>


            <button
                class="add-to-cart bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-sm text-xs font-medium add-to-cart-btn"
                data-product="${product.name}"
                data-price="${product.price}"
                data-id="${product.id}"
                data-type="${product.type}"
            >
                <i class="fas fa-plus text-xs"></i>
                Cotizar
            </button>


          </div>
        </div>
      `;

        const button = article.querySelector(".add-to-cart-btn");
        if (button) {
            button.addEventListener("click", (e) => {
                e.preventDefault();

                const name = button.dataset.product;
                const price = Number(button.dataset.price || 0);
                const id = Number(button.dataset.id);
                const type = button.dataset.type;

                addToCart(name, price, id, type);
            });
        }


      productsGrid.appendChild(article);
    });

    renderPagination();
  }

  // 4) Paginación
  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));

    paginationContainer.classList.toggle("hidden", filteredProducts.length <= ITEMS_PER_PAGE);

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    prevPageBtn.classList.toggle("opacity-40", prevPageBtn.disabled);
    prevPageBtn.classList.toggle("cursor-not-allowed", prevPageBtn.disabled);
    nextPageBtn.classList.toggle("opacity-40", nextPageBtn.disabled);
    nextPageBtn.classList.toggle("cursor-not-allowed", nextPageBtn.disabled);

    pageNumbersContainer.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className =
        "px-3 py-1 text-sm rounded-sm border " +
        (i === currentPage
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100");

      btn.addEventListener("click", () => {
        currentPage = i;
        renderProducts();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      pageNumbersContainer.appendChild(btn);
    }
  }

  // 5) Navegación Anterior / Siguiente
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderProducts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
    if (currentPage < totalPages) {
      currentPage++;
      renderProducts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // 6) Filtros de categoría
  categoryCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      const cat = cb.dataset.category;
      if (!cat) return;

      if (cb.checked) {
        activeCategories.add(cat);
      } else {
        activeCategories.delete(cat);
      }

      currentPage = 1;
      renderProducts();
    });
  });

  // 7) Inicializar
  filteredProducts = computeFilteredProducts();
  renderProducts();
});
