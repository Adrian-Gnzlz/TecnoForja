// frontend/script.js

// frontend/script.js

const API_BASE_URL = window.location.hostname === "127.0.0.1" ||
                     window.location.hostname === "localhost"
  ? "http://localhost:4000/api"                             // Modo desarrollo local
  : "https://tecnoforja-production.up.railway.app/api";     // Backend en Railway



// Clave pública de Stripe (reemplaza por la tuya de modo prueba)
const STRIPE_PUBLIC_KEY = "pk_test_51SbqgB1cYnCkYkReNgJfheAzSGzrxaEhP9O5zBKrC3aDi74h4bcONe1mlHzuX9BBBLFfKBUoWmII3zK16yTCu0tK00MTp0ENgA";

let stripe = null;
let stripeElements = null;
let stripeCardElement = null;


const cart = [];
const productsLocal = [
    { id: 1, name: "Bases para Tinacos", price: 1200, type: "producto" },
    { id: 2, name: "Puertas a Medida", price: 0, type: "servicio" },
    { id: 3, name: "Ventanas a Medida", price: 0, type: "servicio" },
    { id: 4, name: "Rejas para Ventana", price: 0, type: "servicio" },
    { id: 5, name: "Portones", price: 0, type: "servicio" },
    { id: 6, name: "Rejas para Jardín", price: 0, type: "servicio" }
];

const appointments = [];
const payments = [];

// frontend/script.js
function mapServerAppointment(a) {
    return {
        id: a.id,
        folio: a.folio || generateAppointmentFolio(a.id, a.date || a.fecha),

        // Campos base de la cita
        date: a.date || a.fecha,
        time: a.time || a.hora,
        clientName: a.clientName || a.nombre_cliente,
        phone: a.phone || a.telefono,
        email: a.email || a.correo,
        address: a.address || a.direccion,
        comments: a.comments || a.comentarios,

        // Monto estimado
        estimatedAmount:
            a.estimatedAmount ??
            a.monto_estimado ??
            0,

        status: a.status || a.estado,

        // Nuevos campos del panel admin (acepta nombres camelCase o snake_case)
        workStatus: a.workStatus || a.work_status || "pendiente_visita",
        paymentStatus: a.paymentStatus || a.payment_status || "sin_pago",
        priority: a.priority || a.prioridad || "media",
        adminNotes: a.adminNotes || a.admin_notes || ""
    };
}




const WORK_STATUS_LABELS = {
    pendiente_visita: "Pendiente de visita",
    visita_realizada: "Visitado",
    en_proceso: "En proceso",
    terminado: "Terminado",
    entregado: "Entregado",
    cancelado: "Cancelado"
};

const PAYMENT_STATUS_LABELS = {
    sin_pago: "Sin pago",
    pago_registrado: "Con pago registrado",
    pago_parcial: "Pago parcial",
    cancelado: "Cancelado"
};

const PRIORITY_CONFIG = {
    alta: { label: "Prioritario", colorClass: "bg-red-500" },
    media: { label: "Importante", colorClass: "bg-yellow-400" },
    baja: { label: "No prioritario", colorClass: "bg-green-500" }
};


// Estados internos del flujo de trabajo del taller (solo frontend)
const JOB_STATUS_OPTIONS = [
    "Pendiente de visita",
    "Visitado",
    "En fabricación",
    "Listo para instalar",
    "Terminado",
    "Cancelado"
];


function generateAppointmentFolio(id, dateStr) {
    // dateStr viene normalmente en formato "YYYY-MM-DD"
    let year = "";
    if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d)) {
            year = d.getFullYear();
        }
    }
    if (!year) {
        year = new Date().getFullYear();
    }

    const paddedId = String(id).padStart(5, "0");
    return `TF-${year}-${paddedId}`;
}


let currentAppointment = null;

function updateCartCount() {
    const cartCount = document.querySelector(".cart-count");
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

function computeCartTotal() {
    return cart.reduce((sum, item) => {
        if (item.price > 0) {
            return sum + item.price * (item.quantity || 1);
        }
        return sum;
    }, 0);
}

function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "fixed top-6 right-6 bg-gray-800 text-white px-6 py-4 rounded-sm shadow-lg z-50 text-sm";
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return "";

    try {
        const options = {
            day: "2-digit",
            month: "long",
            year: "numeric"
        };

        // Si ya es un Date, lo usamos directo
        if (dateStr instanceof Date) {
            if (!isNaN(dateStr)) {
                return dateStr.toLocaleDateString("es-MX", options);
            }
        }

        const raw = String(dateStr);

        // Si viene como "2026-01-03T00:00:00.000Z" → nos quedamos solo con "2026-01-03"
        let base = raw;
        if (raw.includes("T")) {
            base = raw.split("T")[0];
        }

        // Si viene como "2026-01-03"
        const isoParts = base.split("-");
        if (isoParts.length === 3) {
            const [year, month, day] = isoParts;
            const dateObj = new Date(
                parseInt(year, 10),
                parseInt(month, 10) - 1,
                parseInt(day, 10)
            );
            if (!isNaN(dateObj)) {
                return dateObj.toLocaleDateString("es-MX", options);
            }
        }

        // Si viene como "03/01/2026"
        if (raw.includes("/")) {
            const [dd, mm, yyyy] = raw.split("/");
            if (dd && mm && yyyy) {
                const dateObj = new Date(
                    parseInt(yyyy, 10),
                    parseInt(mm, 10) - 1,
                    parseInt(dd, 10)
                );
                if (!isNaN(dateObj)) {
                    return dateObj.toLocaleDateString("es-MX", options);
                }
            }
        }

        // Si no se pudo interpretar, se regresa tal cual
        return raw;
    } catch (e) {
        return String(dateStr);
    }
}


function allowOnlyLetters(input) {
    input.addEventListener("input", function () {
        // Letras mayúsculas/minúsculas, acentos y espacios
        this.value = this.value.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, "");
    });
}

function allowOnlyDigits(input, maxLength) {
    input.addEventListener("input", function () {
        let value = this.value.replace(/\D/g, "");
        if (typeof maxLength === "number") {
            value = value.slice(0, maxLength);
        }
        this.value = value;
    });
}

function setupCardNumberFormatting() {
    const cardNumberInput = document.getElementById("cardNumber");
    if (!cardNumberInput) return;

    cardNumberInput.addEventListener("input", function () {
        // Solo dígitos, máximo 16
        let value = this.value.replace(/\D/g, "").slice(0, 16);

        // Agrupar en bloques de 4
        const groups = value.match(/.{1,4}/g);
        this.value = groups ? groups.join(" ") : "";
    });
}

function setupCardExpiryFormatting() {
    const expiryInput = document.getElementById("cardExpiry");
    if (!expiryInput) return;

    expiryInput.addEventListener("input", function () {
        // Solo dígitos MMYY
        let value = this.value.replace(/\D/g, "").slice(0, 4);

        if (value.length >= 3) {
            value = value.slice(0, 2) + "/" + value.slice(2);
        }

        this.value = value;
    });
}

function setupAdminFilters() {
    const dateInput = document.getElementById("adminFilterDate");
    const workSelect = document.getElementById("adminFilterJobStatus");
    const paymentSelect = document.getElementById("adminFilterPaymentStatus");
    const clearButton = document.getElementById("adminFilterClear");

    if (dateInput) {
        dateInput.addEventListener("change", () => {
            renderAppointmentsTable();
        });
    }

    if (workSelect) {
        workSelect.addEventListener("change", () => {
            renderAppointmentsTable();
        });
    }

    if (paymentSelect) {
        paymentSelect.addEventListener("change", () => {
            renderAppointmentsTable();
        });
    }

    if (clearButton) {
        clearButton.addEventListener("click", (e) => {
            e.preventDefault();

            if (dateInput) dateInput.value = "";
            if (workSelect) workSelect.value = "todos";
            if (paymentSelect) paymentSelect.value = "todos";

            renderAppointmentsTable();
        });
    }
}



function findProductByName(name) {
    return productsLocal.find(p => p.name === name) || null;
}

function addToCart(productName, price) {
    const baseProduct = findProductByName(productName);

    const product = {
        id: baseProduct.id,
        name: productName,
        price: price,
        type: baseProduct ? baseProduct.type : "servicio",
        quantity: 1
    };

    cart.push(product);
    updateCartCount();
    renderCart();

    showNotification("Servicio agregado a cotización: " + productName);
}

function removeFromCart(itemId) {
    const index = cart.findIndex(item => item.id === itemId);
    if (index !== -1) {
        cart.splice(index, 1);
        updateCartCount();
        renderCart();
    }
}

function clearCart() {
    cart.length = 0;
    updateCartCount();
    renderCart();
}

function renderCart() {
    const cartItemsContainer = document.getElementById("cartItems");
    const emptyMessage = document.getElementById("cartEmptyMessage");
    const totalElement = document.getElementById("cartTotal");

    if (!cartItemsContainer || !emptyMessage || !totalElement) {
        return;
    }

    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
        emptyMessage.classList.remove("hidden");
        totalElement.textContent = "$0 MXN";
        return;
    }

    emptyMessage.classList.add("hidden");

    let total = 0;

    cart.forEach(item => {
        const row = document.createElement("div");
        row.className = "px-6 py-4 flex items-center justify-between";

        const info = document.createElement("div");
        info.className = "flex flex-col";

        const title = document.createElement("span");
        title.className = "text-sm font-medium text-gray-800";
        title.textContent = item.name;

        const meta = document.createElement("span");
        meta.className = "text-xs text-gray-500 mt-1";

        if (item.price > 0) {
            meta.textContent = "Tipo: " + (item.type === "producto" ? "Producto" : "Servicio a medida");
        } else {
            meta.textContent = "Servicio a medida, se cotiza en la visita.";
        }

        info.appendChild(title);
        info.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "flex items-center gap-4";

        const priceLabel = document.createElement("span");
        priceLabel.className = "text-sm text-gray-800";

        if (item.price > 0) {
            priceLabel.textContent = "$" + item.price.toLocaleString("es-MX") + " MXN";
        } else {
            priceLabel.textContent = "A cotizar";
        }

        const removeBtn = document.createElement("button");
        removeBtn.className = "text-xs text-red-600 hover:text-red-800 transition-colors duration-300";
        removeBtn.textContent = "Eliminar";
        removeBtn.addEventListener("click", () => {
            removeFromCart(item.id);
        });

        actions.appendChild(priceLabel);
        actions.appendChild(removeBtn);

        row.appendChild(info);
        row.appendChild(actions);

        cartItemsContainer.appendChild(row);

        if (item.price > 0) {
            total += item.price * (item.quantity || 1);
        }
    });

    totalElement.textContent = "$" + total.toLocaleString("es-MX") + " MXN";
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove("hidden");
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add("hidden");
    }
}

function fillAppointmentCartSummary() {
    const summaryContainer = document.getElementById("appointmentCartSummary");
    if (!summaryContainer) {
        return;
    }

    summaryContainer.innerHTML = "";

    if (cart.length === 0) {
        summaryContainer.textContent = "No hay servicios en el carrito.";
        return;
    }

    cart.forEach(item => {
        const line = document.createElement("div");

        let priceText = "A cotizar";
        if (item.price > 0) {
            priceText = "$" + item.price.toLocaleString("es-MX") + " MXN";
        }

        line.textContent = item.name + " · " + priceText;
        summaryContainer.appendChild(line);
    });

    const total = computeCartTotal();
    const totalLine = document.createElement("div");
    totalLine.className = "pt-2 border-t border-gray-200 mt-2 text-gray-800 font-medium";
    totalLine.textContent = "Total estimado: $" + total.toLocaleString("es-MX") + " MXN";
    summaryContainer.appendChild(totalLine);
}

function setMinDateForAppointment() {
    const dateInput = document.getElementById("apptDate");
    if (!dateInput) return;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${year}-${month}-${day}`;
}

async function createAppointmentFromForm() {
    const dateInput = document.getElementById("apptDate");
    const timeSelect = document.getElementById("apptTime");
    const nameInput = document.getElementById("clientName");
    const phoneInput = document.getElementById("clientPhone");
    const emailInput = document.getElementById("clientEmail");
    const addressInput = document.getElementById("clientAddress");
    const commentsInput = document.getElementById("clientComments");

    if (!dateInput.value || !timeSelect.value || !nameInput.value || !phoneInput.value || !addressInput.value) {
        showNotification("Completa al menos fecha, horario, nombre, teléfono y dirección para registrar la cita.");
        return null;
    }

    if (cart.length === 0) {
        showNotification("Agrega al menos un servicio al carrito antes de confirmar la cita.");
        return null;
    }

    const estimatedAmount = computeCartTotal();

    const payload = {
        date: dateInput.value,
        time: timeSelect.value,
        clientName: nameInput.value,
        phone: phoneInput.value,
        email: emailInput.value || "",
        address: addressInput.value,
        comments: commentsInput.value || "",
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price
        })),
        estimatedAmount: estimatedAmount
    };

    try {
        const response = await fetch(`${API_BASE_URL}/citas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            showNotification("Error al registrar la cita en el servidor.");
            return null;
        }

        const saved = await response.json();

        const appointment = mapServerAppointment(saved);


        appointments.push(appointment);
        currentAppointment = appointment;
        renderAppointmentsTable();

        showNotification("Cita registrada correctamente.");
        return appointment;
    } catch (error) {
        console.error("Error createAppointmentFromForm:", error);
        showNotification("Error de comunicación con el servidor al registrar la cita.");
        return null;
    }
}

// Convierte cualquier valor de fecha a "YYYY-MM-DD" para comparar sin errores de zona horaria
function normalizarFechaYYYYMMDD(valor) {
    if (!valor) return "";

    // Si ya es Date
    if (valor instanceof Date) {
        const y = valor.getFullYear();
        const m = String(valor.getMonth() + 1).padStart(2, "0");
        const d = String(valor.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    const str = String(valor);

    // Si viene como "2026-01-03T00:00:00.000Z"
    if (str.includes("T")) {
        return str.split("T")[0]; // "2026-01-03"
    }

    // Si viene como "2026-01-03"
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }

    // Si viene como "03/01/2026"
    if (str.includes("/")) {
        const [dd, mm, yyyy] = str.split("/");
        if (dd && mm && yyyy) {
            return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        }
    }

    return str;
}

function getAppointmentPaymentStatus(app) {
    // Normalizar el estado de pago tanto para citas nuevas como cargadas de BD
    if (app.paymentStatus) {
        return app.paymentStatus; // valores tipo: 'sin_pago', 'pago_registrado', etc.
    }
    // Compatibilidad: si solo tenemos app.status como texto
    if (app.status === "Con pago registrado") {
        return "pago_registrado";
    }
    return "sin_pago";
}

function getFilteredAppointments() {
    const dateInput = document.getElementById("adminFilterDate");
    const workSelect = document.getElementById("adminFilterJobStatus");
    const paymentSelect = document.getElementById("adminFilterPaymentStatus");

    const dateValue = dateInput ? dateInput.value : "";
    const workValue = workSelect ? workSelect.value : "todos";
    const paymentValue = paymentSelect ? paymentSelect.value : "todos";

    return appointments.filter(app => {
        // Filtro por fecha: normalizamos lo que viene de la BD
        if (dateValue) {
            const fechaApp = normalizarFechaYYYYMMDD(app.date);
            if (fechaApp !== dateValue) {
                return false;
            }
        }

        // Filtro por estado de trabajo (códigos como 'pendiente_visita', 'en_proceso', etc.)
        const workStatus = app.workStatus || "pendiente_visita";
        if (workValue !== "todos" && workStatus !== workValue) {
            return false;
        }

        // Filtro por estado de pago ('sin_pago', 'pago_registrado', etc.)
        const appPaymentStatus = getAppointmentPaymentStatus(app);
        if (paymentValue !== "todos" && appPaymentStatus !== paymentValue) {
            return false;
        }

        return true;
    });
}



function renderAppointmentsTable() {
    const tbody = document.getElementById("appointmentsTableBody");
    const emptyLabel = document.getElementById("appointmentsEmpty");
    if (!tbody || !emptyLabel) return;

    tbody.innerHTML = "";

    // Si de verdad no hay citas en memoria, mensaje genérico
    if (appointments.length === 0) {
        emptyLabel.textContent = "Aún no se han registrado citas en la base de datos.";
        emptyLabel.classList.remove("hidden");
        return;
    }

    // Aplicar filtros
    const filtered = getFilteredAppointments();

    if (filtered.length === 0) {
        emptyLabel.textContent = "No hay citas que coincidan con los filtros seleccionados.";
        emptyLabel.classList.remove("hidden");
        return;
    }

    emptyLabel.classList.add("hidden");

    filtered.forEach(app => {
        const tr = document.createElement("tr");

        // Fecha
        const tdDate = document.createElement("td");
        tdDate.className = "px-3 py-2";
        tdDate.textContent = formatDateForDisplay(app.date);

        // Hora
        const tdTime = document.createElement("td");
        tdTime.className = "px-3 py-2";
        tdTime.textContent = app.time;

        // Folio
        const tdFolio = document.createElement("td");
        tdFolio.className = "px-3 py-2";
        tdFolio.textContent = app.folio || generateAppointmentFolio(app.id, app.date);

        // Cliente
        const tdClient = document.createElement("td");
        tdClient.className = "px-3 py-2";
        tdClient.textContent = app.clientName;

        // Teléfono
        const tdPhone = document.createElement("td");
        tdPhone.className = "px-3 py-2";
        tdPhone.textContent = app.phone;

        // Monto estimado
        const tdAmount = document.createElement("td");
        tdAmount.className = "px-3 py-2";
        tdAmount.textContent =
            "$" + (app.estimatedAmount || 0).toLocaleString("es-MX") + " MXN";

        // Estado del trabajo (select)
        const tdWorkStatus = document.createElement("td");
        tdWorkStatus.className = "px-3 py-2";
        const selectWork = document.createElement("select");
        selectWork.className = "border border-gray-300 rounded px-1 py-0.5 text-xs md:text-sm";

        Object.keys(WORK_STATUS_LABELS).forEach(value => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = WORK_STATUS_LABELS[value];
            if (value === (app.workStatus || "pendiente_visita")) {
                opt.selected = true;
            }
            selectWork.appendChild(opt);
        });

        selectWork.addEventListener("change", () => {
            const newStatus = selectWork.value;
            updateAppointmentFields(
                app.id,
                { workStatus: newStatus },
                "Estado del trabajo actualizado y guardado en la base de datos."
            );
        });

        tdWorkStatus.appendChild(selectWork);

        // Estado de pago (solo texto)
        const tdPaymentStatus = document.createElement("td");
        tdPaymentStatus.className = "px-3 py-2";
        const paymentStatusValue = getAppointmentPaymentStatus(app);
        const paymentLabel =
            PAYMENT_STATUS_LABELS[paymentStatusValue] ||
            "Sin pago";
        tdPaymentStatus.textContent = paymentLabel;

        // Prioridad (círculo de color + select)
        const tdPriority = document.createElement("td");
        tdPriority.className = "px-3 py-2";

        const priorityContainer = document.createElement("div");
        priorityContainer.className = "flex flex-col";

        const priorityVisual = document.createElement("div");
        priorityVisual.className = "flex items-center space-x-1 mb-1";

        const priorityDot = document.createElement("span");
        priorityDot.className = "inline-block w-3 h-3 rounded-full";

        const priorityText = document.createElement("span");
        priorityText.className = "text-xs md:text-sm";

        function applyPriorityVisual(value) {
            const cfg = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.media;
            priorityDot.className =
                "inline-block w-3 h-3 rounded-full " + cfg.colorClass;
            priorityText.textContent = cfg.label;
        }

        applyPriorityVisual(app.priority || "media");

        priorityVisual.appendChild(priorityDot);
        priorityVisual.appendChild(priorityText);

        const selectPriority = document.createElement("select");
        selectPriority.className =
            "border border-gray-300 rounded px-1 py-0.5 text-[11px] md:text-xs";

        Object.keys(PRIORITY_CONFIG).forEach(value => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = PRIORITY_CONFIG[value].label;
            if (value === (app.priority || "media")) {
                opt.selected = true;
            }
            selectPriority.appendChild(opt);
        });

        selectPriority.addEventListener("change", () => {
            const newPriority = selectPriority.value;
            applyPriorityVisual(newPriority);
            updateAppointmentFields(
                app.id,
                { priority: newPriority },
                "Prioridad de la cita actualizada y guardada en la base de datos."
            );
        });

        priorityContainer.appendChild(priorityVisual);
        priorityContainer.appendChild(selectPriority);
        tdPriority.appendChild(priorityContainer);

        // Notas del administrador
        const tdNotes = document.createElement("td");
        tdNotes.className = "px-3 py-2";

        const notesButton = document.createElement("button");
        notesButton.className = "text-xs text-blue-600 hover:underline";
        notesButton.textContent = app.adminNotes ? "Editar nota" : "Agregar nota";

        const notesPreview = document.createElement("p");
        notesPreview.className =
            "text-[11px] text-gray-500 mt-1 max-w-xs truncate";
        notesPreview.textContent = app.adminNotes || "Sin notas.";

        notesButton.addEventListener("click", async () => {
            const currentText = app.adminNotes || "";
            const newText = window.prompt(
                "Escribe la nota interna para esta cita:",
                currentText
            );
            if (newText === null) return;

            await updateAppointmentFields(
                app.id,
                { adminNotes: newText },
                "Nota del administrador guardada en la base de datos."
            );
        });

        tdNotes.appendChild(notesButton);
        tdNotes.appendChild(notesPreview);

        // Agregar celdas a la fila
        tr.appendChild(tdDate);
        tr.appendChild(tdTime);
        tr.appendChild(tdFolio);
        tr.appendChild(tdClient);
        tr.appendChild(tdPhone);
        tr.appendChild(tdAmount);
        tr.appendChild(tdWorkStatus);
        tr.appendChild(tdPaymentStatus);
        tr.appendChild(tdPriority);
        tr.appendChild(tdNotes);

        tbody.appendChild(tr);
    });
}




function renderPaymentsTable() {
    const tbody = document.getElementById("paymentsTableBody");
    const emptyLabel = document.getElementById("paymentsEmpty");
    if (!tbody || !emptyLabel) return;

    tbody.innerHTML = "";

    if (payments.length === 0) {
        emptyLabel.classList.remove("hidden");
        return;
    }

    emptyLabel.classList.add("hidden");

    payments.forEach(p => {
        const tr = document.createElement("tr");

        const tdDate = document.createElement("td");
        tdDate.className = "px-3 py-2";
        tdDate.textContent = formatDateForDisplay(p.date);


        const tdClient = document.createElement("td");
        tdClient.className = "px-3 py-2";
        tdClient.textContent = p.clientName;

        const tdMethod = document.createElement("td");
        tdMethod.className = "px-3 py-2";
        tdMethod.textContent = p.method === "tarjeta" ? "Tarjeta" : "Efectivo";

        const tdAmount = document.createElement("td");
        tdAmount.className = "px-3 py-2";
        tdAmount.textContent = "$" + (p.amount || 0).toLocaleString("es-MX") + " MXN";

        const tdStatus = document.createElement("td");
        tdStatus.className = "px-3 py-2";
        tdStatus.textContent = p.status;

        tr.appendChild(tdDate);
        tr.appendChild(tdClient);
        tr.appendChild(tdMethod);
        tr.appendChild(tdAmount);
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
    });
}

function getPaymentStatusForAppointment(appointmentId) {
    // Busca si hay algún pago registrado para esta cita
    const hasPayment = payments.some(p => p.appointmentId === appointmentId && p.status);
    return hasPayment ? "Con pago registrado" : "Sin pago registrado";
}


function preparePaymentModal(appointment) {
    const summaryEl = document.getElementById("paymentAppointmentSummary");
    const amountEl = document.getElementById("paymentAmount");
    const noteEl = document.getElementById("paymentAmountNote");

    if (!summaryEl || !amountEl || !noteEl) return;

    const folioText = appointment.folio || generateAppointmentFolio(appointment.id, appointment.date);

    // Si ya agregaste formatDateForDisplay, úsalo; si no, deja appointment.date directo
    const formattedDate = typeof formatDateForDisplay === "function"
        ? formatDateForDisplay(appointment.date)
        : appointment.date;

    summaryEl.textContent =
        "Folio: " + folioText +
        " · " + appointment.clientName +
        " · " + formattedDate +
        " · " + appointment.time;

    const total = appointment.estimatedAmount || 0;
    amountEl.textContent = "$" + total.toLocaleString("es-MX") + " MXN";

    if (total === 0) {
        noteEl.textContent = "Actualmente el total estimado es 0...se actualizará cuando el taller registre el presupuesto final.";
    } else {
        noteEl.textContent = "El monto corresponde al total estimado. Puede ajustarse en el presupuesto final del taller.";
    }

    document.querySelectorAll("input[name='paymentMethod']").forEach(r => {
        r.checked = false;
    });
    document.getElementById("cardPaymentSection").classList.add("hidden");
    document.getElementById("cashPaymentSection").classList.add("hidden");

    const cardHolder = document.getElementById("cardHolder");
    const cardNumber = document.getElementById("cardNumber");
    const cardExpiry = document.getElementById("cardExpiry");
    const cardCvv = document.getElementById("cardCvv");

    if (cardHolder) cardHolder.value = "";
    if (cardNumber) cardNumber.value = "";
    if (cardExpiry) cardExpiry.value = "";
    if (cardCvv) cardCvv.value = "";
}

async function openPaymentForExistingAppointment() {
    const folioInput = document.getElementById("existingAppointmentFolio");
    const phoneInput = document.getElementById("existingAppointmentPhone");

    if (!folioInput || !phoneInput) return;

    const folio = folioInput.value.trim().toUpperCase();
    const phone = phoneInput.value.trim();

    if (!folio || !phone) {
        showNotification("Ingresa el folio de la cita y el teléfono registrado.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/citas`);
        if (!response.ok) {
            showNotification("No se pudieron consultar las citas para buscar tu folio.");
            return;
        }

        const data = await response.json();

        let foundRaw = null;

        for (const a of data) {
            const aFolio = generateAppointmentFolio(a.id, a.date).toUpperCase();
            if (aFolio === folio && a.phone === phone) {
                foundRaw = a;
                break;
            }
        }

        if (!foundRaw) {
            showNotification("No se encontró una cita con ese folio y teléfono.");
            return;
        }

        // Evitar pagos duplicados si ya está marcada como pagada
        if (foundRaw.status && foundRaw.status.toLowerCase().includes("pago")) {
            showNotification("Esta cita ya tiene un pago registrado.");
            return;
        }

        const appointment = {
            id: foundRaw.id,
            folio: generateAppointmentFolio(foundRaw.id, foundRaw.date),
            date: foundRaw.date,
            time: foundRaw.time,
            clientName: foundRaw.clientName,
            phone: foundRaw.phone,
            email: foundRaw.email,
            address: foundRaw.address,
            comments: foundRaw.comments,
            estimatedAmount: foundRaw.estimatedAmount,
            status: foundRaw.status
        };

        currentAppointment = appointment;
        preparePaymentModal(appointment);
        openModal("paymentModal");
    } catch (error) {
        console.error("Error openPaymentForExistingAppointment:", error);
        showNotification("Ocurrió un error al buscar la cita. Intenta de nuevo más tarde.");
    }
}

async function registerPayment() {
    if (!currentAppointment) {
        showNotification("No hay una cita seleccionada para registrar el pago.");
        return;
    }

    const methodRadio = document.querySelector("input[name='paymentMethod']:checked");
    if (!methodRadio) {
        showNotification("Selecciona un método de pago (tarjeta o efectivo).");
        return;
    }

    const method = methodRadio.value;
    const amount = currentAppointment.estimatedAmount || 0;

    if (amount <= 0) {
        showNotification("El monto a pagar debe ser mayor a 0.");
        return;
    }

    // Si el método es tarjeta, primero procesamos con Stripe
    if (method === "tarjeta") {
        if (!stripe || !stripeCardElement) {
            showNotification("El pago con tarjeta no está disponible en este momento.");
            return;
        }

        try {
            // 1) Pedir al backend un PaymentIntent
            const intentResponse = await fetch(`${API_BASE_URL}/pagos/crear-intento`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    appointmentId: currentAppointment.id,
                    clientName: currentAppointment.clientName,
                    amount: amount
                })
            });

            if (!intentResponse.ok) {
                showNotification("No se pudo iniciar el pago con tarjeta.");
                return;
            }

            const intentData = await intentResponse.json();
            const clientSecret = intentData.clientSecret;

            if (!clientSecret) {
                showNotification("Respuesta inválida del servidor de pagos.");
                return;
            }

            // 2) Confirmar el pago con Stripe en el navegador
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: stripeCardElement,
                    billing_details: {
                        name: currentAppointment.clientName || "Cliente TecnoForja"
                    }
                }
            });

            if (error) {
                console.error("Error Stripe confirmCardPayment:", error);
                showNotification("Error al procesar el pago con tarjeta: " + (error.message || ""));
                return;
            }

            if (!paymentIntent || paymentIntent.status !== "succeeded") {
                showNotification("El pago con tarjeta no se completó correctamente.");
                return;
            }

            // Si llegamos aquí, Stripe ya cobró exitosamente
        } catch (err) {
            console.error("Error al procesar pago con tarjeta:", err);
            showNotification("Ocurrió un problema al procesar el pago con tarjeta.");
            return;
        }
    }

    // 3) Registrar el pago en nuestra base de datos (tarjeta ya cobrada o efectivo)
    const payload = {
        appointmentId: currentAppointment.id,
        clientName: currentAppointment.clientName,
        method: method,
        amount: amount
    };

    try {
        const response = await fetch(`${API_BASE_URL}/pagos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            showNotification("Error al registrar el pago en el servidor.");
            return;
        }

        const saved = await response.json();

        const payment = {
            id: saved.id,
            appointmentId: saved.appointmentId,
            clientName: saved.clientName,
            method: saved.method,
            amount: saved.amount,
            status: saved.status,
            date: saved.date
        };

        payments.push(payment);

        // Recargar citas desde el servidor para reflejar payment_status
        await loadAppointmentsFromServer();

        renderPaymentsTable();
        showNotification("Pago registrado y guardado en la base de datos.");
        closeModal("paymentModal");
    } catch (error) {
        console.error("Error registerPayment:", error);
        showNotification("Error de comunicación con el servidor al registrar el pago.");
    }
}



async function loadAppointmentsFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/citas`);
        if (!response.ok) {
            showNotification("No se pudieron cargar las citas desde el servidor.");
            return;
        }
        const data = await response.json();

        appointments.length = 0;
        data.forEach(a => {
            appointments.push(mapServerAppointment(a));
        });

        renderAppointmentsTable();
    } catch (error) {
        console.error("Error loadAppointmentsFromServer:", error);
        showNotification("Error al comunicar con el servidor para cargar citas.");
    }
}

async function updateAppointmentFields(appointmentId, fields, successMessage) {
    try {
        const response = await fetch(`${API_BASE_URL}/citas/${appointmentId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(fields)
        });

        if (!response.ok) {
            showNotification("No se pudo guardar la actualización de la cita en la base de datos.");
            return;
        }

        const updated = await response.json();
        const mapped = mapServerAppointment(updated);

        const index = appointments.findIndex(a => a.id === mapped.id);
        if (index !== -1) {
            appointments[index] = mapped;
        }

        renderAppointmentsTable();

        if (successMessage) {
            showNotification(successMessage);
        } else {
            showNotification("Cita actualizada y guardada en la base de datos.");
        }
    } catch (error) {
        console.error("Error updateAppointmentFields:", error);
        showNotification("Error de comunicación con el servidor al actualizar la cita.");
    }
}


async function loadPaymentsFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/pagos`);
        if (!response.ok) {
            showNotification("No se pudieron cargar los pagos desde el servidor.");
            return;
        }
        const data = await response.json();

        payments.length = 0;
        data.forEach(p => {
            payments.push({
                id: p.id,
                appointmentId: p.appointmentId,
                clientName: p.clientName,
                method: p.method,
                amount: p.amount,
                status: p.status,
                date: p.date
            });
        });

        renderPaymentsTable();
    } catch (error) {
        console.error("Error loadPaymentsFromServer:", error);
        showNotification("Error al comunicar con el servidor para cargar pagos.");
    }
}

async function loadAdminData() {
    await loadAppointmentsFromServer();
    await loadPaymentsFromServer();
}

// Tour de ayuda (tarjetas dinámicas)
// ------------------------------

let onboardingSteps = [
    {
        selector: "#servicios",
        title: "Catálogo de servicios",
        text: "Aquí puedes ver los trabajos que realiza el taller: bases para tinacos, puertas, ventanas, rejas y portones. Usa los botones de “Agregar” o “Cotizar” para ir llenando tu carrito de cotización.",
        position: "bottom"
    },
    {
        selector: "#openCart",
        title: "Carrito de cotización",
        text: "Este botón abre tu carrito. Ahí verás un resumen de los trabajos seleccionados y el total estimado. Desde el carrito puedes continuar para agendar tu cita.",
        position: "bottom"
    },
    {
        selector: "#existingAppointmentForm",
        title: "Pagar una cita ya registrada",
        text: "Si ya agendaste una cita antes, aquí puedes ingresar el folio de la cita y el teléfono registrado para buscarla y registrar el pago más adelante.",
        position: "top"
    },
    {
        selector: "#openAdminLogin",
        title: "Panel administrativo del taller",
        text: "Desde este acceso, solo el personal del taller revisa citas, pagos registrados y el funcionamiento general del sistema.",
        position: "left"
    }
];


let currentOnboardingStep = 0;
let highlightedElement = null;

function highlightElement(element) {
    if (highlightedElement) {
        highlightedElement.classList.remove(
            "ring-4",
            "ring-offset-2",
            "ring-indigo-500",
            "ring-offset-transparent"
        );
    }
    highlightedElement = element;
    if (highlightedElement) {
        highlightedElement.classList.add(
            "ring-4",
            "ring-offset-2",
            "ring-indigo-500",
            "ring-offset-transparent"
        );
    }
}

function positionOnboardingCard(step) {
    const card = document.getElementById("onboardingCard");
    if (!card || !step) return;

    const target = document.querySelector(step.selector);
    if (!target) return;

    // Coordenadas del elemento en la ventana
    const rect = target.getBoundingClientRect();

    const cardRect = card.getBoundingClientRect();
    let top = 0;
    let left = 0;

    switch (step.position) {
        case "top":
            top = rect.top - cardRect.height - 16;
            left = rect.left + rect.width / 2 - cardRect.width / 2;
            break;
        case "left":
            top = rect.top + rect.height / 2 - cardRect.height / 2;
            left = rect.left - cardRect.width - 16;
            break;
        case "right":
            top = rect.top + rect.height / 2 - cardRect.height / 2;
            left = rect.right + 16;
            break;
        case "bottom":
        default:
            top = rect.bottom + 16;
            left = rect.left + rect.width / 2 - cardRect.width / 2;
            break;
    }

    const padding = 8;
    const maxLeft = window.innerWidth - cardRect.width - padding;
    const maxTop = window.innerHeight - cardRect.height - padding;

    if (left < padding) left = padding;
    if (left > maxLeft) left = maxLeft;
    if (top < padding) top = padding;
    if (top > maxTop) top = maxTop;

    // Ojo: como el overlay es fixed, usamos coordenadas de ventana, sin scrollY/scrollX
    card.style.top = top + "px";
    card.style.left = left + "px";
}


function showOnboardingStep(index) {
    const overlay = document.getElementById("onboardingOverlay");
    const titleEl = document.getElementById("onboardingTitle");
    const textEl = document.getElementById("onboardingText");
    const prevBtn = document.getElementById("onboardingPrev");
    const nextBtn = document.getElementById("onboardingNext");

    if (!overlay || !titleEl || !textEl) return;

    // Si nos salimos de rango, terminamos el tour
    if (index < 0 || index >= onboardingSteps.length) {
        endOnboarding();
        return;
    }

    const step = onboardingSteps[index];
    const target = document.querySelector(step.selector);

    // Si este paso no encuentra el elemento, saltamos al siguiente
    if (!target) {
        const nextIndex = index + 1;
        if (nextIndex < onboardingSteps.length) {
            showOnboardingStep(nextIndex);
        } else {
            endOnboarding();
        }
        return;
    }

    currentOnboardingStep = index;

    // Calcular a dónde queremos scrollear
    const rect = target.getBoundingClientRect();
    const margenSuperior = 120;
    const destinoY = rect.top + window.scrollY - margenSuperior;

    window.scrollTo({
        top: destinoY,
        behavior: "smooth"
    });

    overlay.classList.remove("hidden");
    titleEl.textContent = step.title;
    textEl.textContent = step.text;

    highlightElement(target);

    // Reposicionar la tarjeta después del scroll
    setTimeout(function () {
        positionOnboardingCard(step);
    }, 400);

    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === onboardingSteps.length - 1 ? "Finalizar" : "Siguiente";
}




function startOnboarding(forceManual) {
    const overlay = document.getElementById("onboardingOverlay");
    if (!overlay) return;

    if (!forceManual) {
        const alreadyDone = window.localStorage.getItem("tecnoforja_onboarding_done");
        if (alreadyDone) {
            return;
        }
    }

    showOnboardingStep(0);

    if (!forceManual) {
        window.localStorage.setItem("tecnoforja_onboarding_done", "1");
    }
}

function endOnboarding() {
    const overlay = document.getElementById("onboardingOverlay");
    if (overlay) {
        overlay.classList.add("hidden");
    }
    highlightElement(null);
}


document.addEventListener("DOMContentLoaded", function () {
        // Inicializar Stripe si está disponible y existe el contenedor
    const cardElementContainer = document.getElementById("cardElement");
    if (window.Stripe && STRIPE_PUBLIC_KEY && cardElementContainer) {
        try {
            stripe = Stripe(STRIPE_PUBLIC_KEY);
            stripeElements = stripe.elements();
            stripeCardElement = stripeElements.create("card");
            stripeCardElement.mount("#cardElement");
        } catch (error) {
            console.error("Error inicializando Stripe:", error);
        }
    }

    const addToCartButtons = document.querySelectorAll(".add-to-cart");

    addToCartButtons.forEach(button => {
        button.addEventListener("click", function (e) {
            e.preventDefault();
            const productName = this.getAttribute("data-product");
            const price = parseInt(this.getAttribute("data-price"), 10) || 0;
            addToCart(productName, price);
        });
    });

    const openCartButton = document.getElementById("openCart");
    if (openCartButton) {
        openCartButton.addEventListener("click", function (e) {
            e.preventDefault();
            openModal("cartModal");
            renderCart();
        });
    }

    const closeCartButton = document.getElementById("closeCart");
    if (closeCartButton) {
        closeCartButton.addEventListener("click", function (e) {
            e.preventDefault();
            closeModal("cartModal");
        });
    }

    const cartModal = document.getElementById("cartModal");
    if (cartModal) {
        cartModal.addEventListener("click", function (e) {
            if (e.target === cartModal) {
                closeModal("cartModal");
            }
        });
    }

    const clearButton = document.getElementById("cartClear");
    if (clearButton) {
        clearButton.addEventListener("click", function (e) {
            e.preventDefault();
            if (cart.length > 0) {
                clearCart();
                showNotification("Carrito vaciado.");
            }
        });
    }

    const continueButton = document.getElementById("cartContinue");
    if (continueButton) {
        continueButton.addEventListener("click", function (e) {
            e.preventDefault();
            if (cart.length === 0) {
                showNotification("Agrega al menos un servicio antes de continuar con la cita.");
                return;
            }
            closeModal("cartModal");
            fillAppointmentCartSummary();
            setMinDateForAppointment();
            openModal("appointmentModal");
        });
    }

    const closeAppointmentButton = document.getElementById("closeAppointment");
    const appointmentCancelButton = document.getElementById("appointmentCancel");
    [closeAppointmentButton, appointmentCancelButton].forEach(btn => {
        if (btn) {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                closeModal("appointmentModal");
            });
        }
    });

    const appointmentModal = document.getElementById("appointmentModal");
    if (appointmentModal) {
        appointmentModal.addEventListener("click", function (e) {
            if (e.target === appointmentModal) {
                closeModal("appointmentModal");
            }
        });
    }

    const appointmentSubmitButton = document.getElementById("appointmentSubmit");
    if (appointmentSubmitButton) {
        appointmentSubmitButton.addEventListener("click", async function (e) {
            e.preventDefault();
            const appointment = await createAppointmentFromForm();
            if (appointment) {
                closeModal("appointmentModal");
                preparePaymentModal(appointment);
                openModal("paymentModal");
            }
        });
    }

    const closePaymentButton = document.getElementById("closePayment");
    const paymentCancelButton = document.getElementById("paymentCancel");
    [closePaymentButton, paymentCancelButton].forEach(btn => {
        if (btn) {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                closeModal("paymentModal");
            });
        }
    });

    const paymentModal = document.getElementById("paymentModal");
    if (paymentModal) {
        paymentModal.addEventListener("click", function (e) {
            if (e.target === paymentModal) {
                closeModal("paymentModal");
            }
        });
    }

    document.querySelectorAll("input[name='paymentMethod']").forEach(radio => {
        radio.addEventListener("change", function () {
            const cardSection = document.getElementById("cardPaymentSection");
            const cashSection = document.getElementById("cashPaymentSection");
            if (this.value === "tarjeta") {
                cardSection.classList.remove("hidden");
                cashSection.classList.add("hidden");
            } else if (this.value === "efectivo") {
                cashSection.classList.remove("hidden");
                cardSection.classList.add("hidden");
            }
        });
    });

    const paymentConfirmButton = document.getElementById("paymentConfirm");
    if (paymentConfirmButton) {
        paymentConfirmButton.addEventListener("click", async function (e) {
            e.preventDefault();
            await registerPayment();
        });
    }

    const openAdminLoginButton = document.getElementById("openAdminLogin");
    if (openAdminLoginButton) {
        openAdminLoginButton.addEventListener("click", function (e) {
            e.preventDefault();
            openModal("adminLoginModal");
        });
    }

    const closeAdminLoginButton = document.getElementById("closeAdminLogin");
    const adminLoginCancelButton = document.getElementById("adminLoginCancel");
    [closeAdminLoginButton, adminLoginCancelButton].forEach(btn => {
        if (btn) {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                closeModal("adminLoginModal");
            });
        }
    });

    const adminLoginModal = document.getElementById("adminLoginModal");
    if (adminLoginModal) {
        adminLoginModal.addEventListener("click", function (e) {
            if (e.target === adminLoginModal) {
                closeModal("adminLoginModal");
            }
        });
    }

    const adminLoginSubmitButton = document.getElementById("adminLoginSubmit");
    if (adminLoginSubmitButton) {
        adminLoginSubmitButton.addEventListener("click", async function (e) {
            e.preventDefault();
            const passInput = document.getElementById("adminPassword");
            if (passInput && passInput.value === "admin123") {
                closeModal("adminLoginModal");
                await loadAdminData();
                openModal("adminPanelModal");
                showNotification("Acceso administrativo concedido.");
            } else {
                showNotification("Contraseña incorrecta.");
            }
        });
    }

    const closeAdminPanelButton = document.getElementById("closeAdminPanel");
    if (closeAdminPanelButton) {
        closeAdminPanelButton.addEventListener("click", function (e) {
            e.preventDefault();
            closeModal("adminPanelModal");
        });
    }

    const adminPanelModal = document.getElementById("adminPanelModal");
    if (adminPanelModal) {
        adminPanelModal.addEventListener("click", function (e) {
            if (e.target === adminPanelModal) {
                closeModal("adminPanelModal");
            }
        });
    }

    // Listeners para filtros del panel admin (usamos los ids correctos)
    const adminFilterDate = document.getElementById("adminFilterDate");
    const adminFilterJobStatus = document.getElementById("adminFilterJobStatus");
    const adminFilterPaymentStatus = document.getElementById("adminFilterPaymentStatus");
    const adminFilterClear = document.getElementById("adminFilterClear");

    [adminFilterDate, adminFilterJobStatus, adminFilterPaymentStatus].forEach(ctrl => {
        if (ctrl) {
            ctrl.addEventListener("change", function () {
                renderAppointmentsTable();
            });
        }
    });

    if (adminFilterClear) {
        adminFilterClear.addEventListener("click", function (e) {
            e.preventDefault();
            if (adminFilterDate) adminFilterDate.value = "";
            if (adminFilterJobStatus) adminFilterJobStatus.value = "todos";
            if (adminFilterPaymentStatus) adminFilterPaymentStatus.value = "todos";
            renderAppointmentsTable();
        });
    }

    // Opcional, para centralizar la lógica de filtros
    setupAdminFilters();



    // Delegar eventos dentro de la tabla de citas (cambio de estado y notas)
    const appointmentsTableBody = document.getElementById("appointmentsTableBody");
    if (appointmentsTableBody) {
        // Cambio de estado del trabajo
        appointmentsTableBody.addEventListener("change", function (e) {
            const target = e.target;
            if (target.classList.contains("admin-job-status")) {
                const appId = parseInt(target.dataset.appId, 10);
                const app = appointments.find(a => a.id === appId);
                if (app) {
                    app.jobStatus = target.value;
                    showNotification("Estado del trabajo actualizado para esta cita (solo en esta sesión).");
                }
            }
        });

        // Abrir modal de notas internas
        appointmentsTableBody.addEventListener("click", function (e) {
            const target = e.target;
            if (target.classList.contains("admin-note-btn")) {
                const appId = parseInt(target.dataset.appId, 10);
                const app = appointments.find(a => a.id === appId);
                if (!app) return;

                const notesInfo = document.getElementById("adminNotesAppointmentInfo");
                const notesText = document.getElementById("adminNotesText");

                if (notesInfo) {
                    const formattedDate = formatDateForDisplay(app.date);
                    notesInfo.textContent =
                        "Cita: " +
                        (app.folio || generateAppointmentFolio(app.id, app.date)) +
                        " · " +
                        app.clientName +
                        " · " +
                        formattedDate +
                        " · " +
                        app.time;
                }

                if (notesText) {
                    notesText.value = app.internalNote || "";
                    notesText.dataset.appId = String(app.id);
                }

                openModal("adminNotesModal");
            }
        });
    }


    const links = document.querySelectorAll("a[href='#']");
    links.forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
        });
    });

        // Validación de solo letras para nombre de cliente y titular de tarjeta
    const clientNameInput = document.getElementById("clientName");
    const cardHolderInput = document.getElementById("cardHolder");

    if (clientNameInput) {
        allowOnlyLetters(clientNameInput);
    }
    if (cardHolderInput) {
        allowOnlyLetters(cardHolderInput);
    }

    // Solo números en teléfono (ej. máximo 10 dígitos, ajusta si quieres)
    const clientPhoneInput = document.getElementById("clientPhone");
    if (clientPhoneInput) {
        allowOnlyDigits(clientPhoneInput, 10);
    }

    // Solo números en CVV (3 o 4 dígitos)
    const cardCvvInput = document.getElementById("cardCvv");
    if (cardCvvInput) {
        allowOnlyDigits(cardCvvInput, 4);
    }

    const openExistingAppointmentPaymentButton = document.getElementById("openExistingAppointmentPayment");
    if (openExistingAppointmentPaymentButton) {
        openExistingAppointmentPaymentButton.addEventListener("click", async function (e) {
            e.preventDefault();
            await openPaymentForExistingAppointment();
        });
    }

    // Botones del modal de notas internas
    const adminNotesClose = document.getElementById("adminNotesClose");
    const adminNotesCancel = document.getElementById("adminNotesCancel");
    const adminNotesSave = document.getElementById("adminNotesSave");
    const adminNotesModal = document.getElementById("adminNotesModal");
    const adminNotesText = document.getElementById("adminNotesText");

    [adminNotesClose, adminNotesCancel].forEach(btn => {
        if (btn) {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                closeModal("adminNotesModal");
            });
        }
    });

    if (adminNotesModal) {
        adminNotesModal.addEventListener("click", function (e) {
            if (e.target === adminNotesModal) {
                closeModal("adminNotesModal");
            }
        });
    }

    if (adminNotesSave && adminNotesText) {
        adminNotesSave.addEventListener("click", function (e) {
            e.preventDefault();
            const appIdStr = adminNotesText.dataset.appId;
            if (!appIdStr) {
                closeModal("adminNotesModal");
                return;
            }
            const appId = parseInt(appIdStr, 10);
            const app = appointments.find(a => a.id === appId);
            if (app) {
                app.internalNote = adminNotesText.value || "";
                showNotification("Notas internas guardadas (solo en esta sesión).");
                renderAppointmentsTable();
            }
            closeModal("adminNotesModal");
        });
    }


        // Eventos para el tour de ayuda
    const startOnboardingButton = document.getElementById("startOnboarding");
    const onboardingNext = document.getElementById("onboardingNext");
    const onboardingPrev = document.getElementById("onboardingPrev");
    const onboardingSkip = document.getElementById("onboardingSkip");
    const onboardingOverlay = document.getElementById("onboardingOverlay");

    if (startOnboardingButton) {
        startOnboardingButton.addEventListener("click", function () {
            startOnboarding(true);
        });
    }

    if (onboardingNext) {
        onboardingNext.addEventListener("click", function () {
            const isLast = currentOnboardingStep === onboardingSteps.length - 1;
            if (isLast) {
                endOnboarding();
            } else {
                showOnboardingStep(currentOnboardingStep + 1);
            }
        });
    }

    if (onboardingPrev) {
        onboardingPrev.addEventListener("click", function () {
            if (currentOnboardingStep > 0) {
                showOnboardingStep(currentOnboardingStep - 1);
            }
        });
    }

    if (onboardingSkip) {
        onboardingSkip.addEventListener("click", function () {
            endOnboarding();
        });
    }

    if (onboardingOverlay) {
        onboardingOverlay.addEventListener("click", function (e) {
            if (e.target === onboardingOverlay) {
                endOnboarding();
            }
        });
    }

    // Lanzar el tour automáticamente solo la primera vez
    startOnboarding(false);


    // Formato especial para número de tarjeta y vencimiento
    setupCardNumberFormatting();
    setupCardExpiryFormatting();

    updateCartCount();
    renderCart();
    setMinDateForAppointment();
});
