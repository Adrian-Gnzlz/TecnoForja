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

    // Referencias al modal de detalle de producto
  const productDetailModal = document.getElementById("productDetailModal");
  const modalProductName = document.getElementById("modalProductName");
  const modalProductCategory = document.getElementById("modalProductCategory");
  const modalProductPrice = document.getElementById("modalProductPrice");
  const modalProductDescription = document.getElementById("modalProductDescription");
  const modalProductNote = document.getElementById("modalProductNote");
  const modalAddToCartBtn = document.getElementById("modalAddToCartBtn");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalOverlay = document.getElementById("productDetailOverlay");
  const modalProductImage = document.getElementById("modalProductImage");



  if (!productsGrid || !paginationContainer || !prevPageBtn || !nextPageBtn || !pageNumbersContainer) {
    return;
  }

  // 1) Catálogo de productos (fallback estático por si la API falla)
  const FALLBACK_CATALOG = [
    // Trabajos de herrería
    {
      id: 101,
      name: "Puertas con herrería",
      description: "Puertas metálicas personalizadas con diseño de herrería decorativa y seguridad.",
      category: "herreria",
      badge: "Herrería",
      price: 0,
      image: "assets/productos/puertas-herreria.jpg"
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





    // Catálogo real que usará la página (BD o fallback)
  let catalog = [];

  const CATEGORY_LABELS = {
    herreria: "Trabajos de herrería",
    estructuras: "Estructuras metálicas",
    soldadura: "Trabajos de soldadura"
  };

  async function loadCatalogFromApi() {
    try {
      if (typeof API_BASE_URL === "undefined") {
        console.warn("API_BASE_URL no definido; usando catálogo estático.");
        catalog = FALLBACK_CATALOG;
        return;
      }

      const response = await fetch(`${API_BASE_URL}/catalogo`);
      if (!response.ok) {
        throw new Error("Respuesta no OK al obtener catálogo");
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.warn("Catálogo vacío desde API; usando catálogo estático.");
        catalog = FALLBACK_CATALOG;
        return;
      }

      catalog = data.map((row, index) => {
        const rawPrice = row.price ?? row.precio_base ?? 0;
        const numericPrice = Number(rawPrice) || 0;
        const category = row.categoria || "herreria";
        const badge = row.badge || CATEGORY_LABELS[category] || null;
        const type =
          row.tipo || (numericPrice > 0 ? "producto" : "servicio");

        return {
          id: row.id ?? index + 1,
          name: row.nombre || row.name || "",
          description: row.descripcion || row.description || "",
          category,
          badge,
          price: numericPrice,
          type,
          image:
            row.imagen_url || "assets/productos/placeholder-producto.jpg"
        };
      });
    } catch (error) {
      console.error(
        "Error al cargar catálogo desde API, usando catálogo estático:",
        error
      );
      catalog = FALLBACK_CATALOG;
    }
  }




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
    const pageProducts = filteredProducts.slice(start, end);

    productsGrid.innerHTML = "";

    pageProducts.forEach((product) => {
      const article = document.createElement("article");
      article.className =
        "product-card bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden " +
        "group transform transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-gray-200 cursor-pointer";

      // Información básica como data-atributos para el modal
      article.dataset.category = product.category || "";
      article.dataset.name = product.name || "";
      article.dataset.description = product.description || "";
      article.dataset.price = String(product.price || 0);
      article.dataset.type = product.type || "servicio";
      article.dataset.id = String(product.id || "");
      article.dataset.image = product.image || "assets/productos/placeholder-producto.jpg";


      const priceLabel =
        product.price > 0
          ? "$" + product.price.toLocaleString("es-MX") + " MXN"
          : "A cotizar";

      article.innerHTML = `
        <div class="h-28 bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center relative">
          ${
            product.badge
              ? `
          <span class="absolute top-3 left-3 px-3 py-1 text-[11px] tracking-wide rounded-full bg-black/50 text-gray-100 uppercase">
            ${product.badge}
          </span>
          `
              : ""
          }
          <i class="fas fa-tools text-3xl text-gray-100 opacity-90"></i>
        </div>
        <div class="p-5 flex flex-col justify-between h-[210px]">
          <div>
            <h3 class="text-base font-semibold text-gray-800 mb-1">
              ${product.name}
            </h3>
            <p class="text-xs uppercase tracking-wide text-gray-400 mb-2">
              ${product.categoryLabel || CATEGORY_LABELS[product.category] || product.badge || ""}
            </p>

            <p class="text-sm text-gray-600">
              ${product.description}
            </p>
          </div>

          <div class="mt-4 flex items-center justify-between">
            <span class="text-sm font-medium text-gray-800">
              ${priceLabel}
            </span>

            <button
              class="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-sm text-xs font-medium add-to-cart-btn"
              data-product="${product.name}"
              data-price="${product.price}"
              data-id="${product.id}"
              data-type="${product.type}"
              type="button"
            >
              <i class="fas fa-plus text-xs"></i>
              Cotizar
            </button>
          </div>
        </div>
      `;

      // Botón Cotizar: sigue usando el carrito actual
      const button = article.querySelector(".add-to-cart-btn");
      if (button) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation(); // Importante: evitar que abra el modal

          const name = button.dataset.product;
          const price = Number(button.dataset.price || 0);
          const id = Number(button.dataset.id);
          const type = button.dataset.type;

          addToCart(name, price, id, type);
        });
      }

      // Click en la tarjeta (pero no en el botón): abrir modal
      article.addEventListener("click", () => {
        openProductDetailModalFromCard(article);
      });

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

    // 6) Lógica del modal de detalle de producto
    function openProductDetailModalFromCard(card) {
    if (!productDetailModal) return;

    const name = card.dataset.name || "";
    const description =
      card.dataset.description ||
      "Trabajo fabricado a medida según las necesidades específicas del cliente.";
    const category = card.dataset.category || "";
    const price = Number(card.dataset.price || 0);
    const type = card.dataset.type || "servicio";

    if (modalProductName) modalProductName.textContent = name;
    if (modalProductCategory)
      modalProductCategory.textContent = category ? "Categoría: " + category : "";

    if (modalProductPrice) {
      modalProductPrice.textContent =
        price > 0
          ? "Precio estimado: $" + price.toLocaleString("es-MX") + " MXN"
          : "Precio: A cotizar de forma personalizada.";
    }

    if (modalProductDescription) {
      modalProductDescription.textContent = description;
    }

    // Imagen del producto (con placeholder por defecto)
    const imageUrl =
      card.dataset.image || "assets/productos/placeholder-producto.jpg";

    if (modalProductImage) {
      modalProductImage.src = imageUrl;
      modalProductImage.alt = name || "Trabajo de herrería";
    }

    // Configurar botón de agregar al carrito desde el modal
    if (modalAddToCartBtn) {
      modalAddToCartBtn.dataset.product = name;
      modalAddToCartBtn.dataset.price = String(price || 0);
      modalAddToCartBtn.dataset.type = type;
      modalAddToCartBtn.dataset.id = card.dataset.id || "";
    }

    productDetailModal.classList.remove("hidden");
  }


  function closeProductDetailModal() {
    if (!productDetailModal) return;
    productDetailModal.classList.add("hidden");
  }

  // Eventos del modal
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      closeProductDetailModal();
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener("click", () => {
      closeProductDetailModal();
    });
  }

  if (modalAddToCartBtn) {
    modalAddToCartBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const name = modalAddToCartBtn.dataset.product || "";
      const price = Number(modalAddToCartBtn.dataset.price || 0);
      const id = Number(modalAddToCartBtn.dataset.id || 0);
      const type = modalAddToCartBtn.dataset.type || "servicio";

      if (name) {
        addToCart(name, price, id, type);
      }

      closeProductDetailModal();
    });
  }

  // Cerrar con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProductDetailModal();
    }
  });


  // 7) Inicializar
(async () => {
await loadCatalogFromApi();
filteredProducts = computeFilteredProducts();
renderProducts();
})();

});
