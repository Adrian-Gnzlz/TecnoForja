// frontend/script.js

const API_BASE_URL = "https://tecnoforja-production.up.railway.app/api";

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

        const appointment = {
            id: saved.id,
            folio: generateAppointmentFolio(saved.id, saved.date),
            date: saved.date,
            time: saved.time,
            clientName: saved.clientName,
            phone: saved.phone,
            email: saved.email,
            address: saved.address,
            comments: saved.comments,
            estimatedAmount: saved.estimatedAmount,
            status: saved.status,          // estado general (registrada / con pago)
            jobStatus: "Pendiente de visita", // flujo interno del taller
            internalNote: ""                  // notas solo para admin
        };



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



function renderAppointmentsTable() {
    const tbody = document.getElementById("appointmentsTableBody");
    const emptyLabel = document.getElementById("appointmentsEmpty");
    if (!tbody || !emptyLabel) return;

    tbody.innerHTML = "";

    // Leer filtros
    const dateFilterInput = document.getElementById("adminFilterDate");
    const jobStatusFilterSelect = document.getElementById("adminFilterJobStatus");
    const paymentStatusFilterSelect = document.getElementById("adminFilterPaymentStatus");

    const dateFilter = dateFilterInput && dateFilterInput.value ? dateFilterInput.value : "";
    const jobStatusFilter = jobStatusFilterSelect ? jobStatusFilterSelect.value : "todos";
    const paymentStatusFilter = paymentStatusFilterSelect ? paymentStatusFilterSelect.value : "todos";

    // Aplicar filtros
    const filtered = appointments.filter(app => {
        // Filtrar por fecha exacta usando formato normalizado YYYY-MM-DD
        if (dateFilter) {
            const fechaFiltro = dateFilter;           // valor del input date (YYYY-MM-DD)
            const fechaCita = normalizarFechaYYYYMMDD(app.date);

            if (fechaCita !== fechaFiltro) {
                return false;
            }
        }


        // Filtrar por estado del trabajo
        if (jobStatusFilter !== "todos") {
            const js = app.jobStatus || "Pendiente de visita";
            if (js !== jobStatusFilter) return false;
        }

        // Filtrar por estado de pago
        const paymentStatus = getPaymentStatusForAppointment(app.id);
        if (paymentStatusFilter === "sinPago" && paymentStatus !== "Sin pago registrado") {
            return false;
        }
        if (paymentStatusFilter === "conPago" && paymentStatus !== "Con pago registrado") {
            return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        emptyLabel.classList.remove("hidden");
        return;
    }

    emptyLabel.classList.add("hidden");

    filtered.forEach(app => {
        const tr = document.createElement("tr");

        const tdDate = document.createElement("td");
        tdDate.className = "px-3 py-2 whitespace-nowrap";
        tdDate.textContent = formatDateForDisplay(app.date);

        const tdTime = document.createElement("td");
        tdTime.className = "px-3 py-2 whitespace-nowrap";
        tdTime.textContent = app.time;

        const tdFolio = document.createElement("td");
        tdFolio.className = "px-3 py-2 whitespace-nowrap";
        tdFolio.textContent = app.folio || generateAppointmentFolio(app.id, app.date);

        const tdClient = document.createElement("td");
        tdClient.className = "px-3 py-2 whitespace-nowrap";
        tdClient.textContent = app.clientName;

        const tdPhone = document.createElement("td");
        tdPhone.className = "px-3 py-2 whitespace-nowrap";
        tdPhone.textContent = app.phone;

        const tdAddress = document.createElement("td");
        tdAddress.className = "px-3 py-2 hidden lg:table-cell";
        tdAddress.textContent = app.address || "";

        const tdAmount = document.createElement("td");
        tdAmount.className = "px-3 py-2 whitespace-nowrap";
        tdAmount.textContent =
            "$" + (app.estimatedAmount || 0).toLocaleString("es-MX") + " MXN";

        // Estado del trabajo (select)
        const tdJobStatus = document.createElement("td");
        tdJobStatus.className = "px-3 py-2 whitespace-nowrap";
        const select = document.createElement("select");
        select.className =
            "admin-job-status border border-gray-300 rounded-sm px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-700";
        select.dataset.appId = app.id;

        JOB_STATUS_OPTIONS.forEach(opt => {
            const optionEl = document.createElement("option");
            optionEl.value = opt;
            optionEl.textContent = opt;
            select.appendChild(optionEl);
        });

        select.value = app.jobStatus || "Pendiente de visita";
        tdJobStatus.appendChild(select);

        // Estado de pago
        const tdPaymentStatus = document.createElement("td");
        tdPaymentStatus.className = "px-3 py-2 whitespace-nowrap";
        const paymentStatus = getPaymentStatusForAppointment(app.id);
        tdPaymentStatus.textContent = paymentStatus;

        // Notas internas
        const tdNotes = document.createElement("td");
        tdNotes.className = "px-3 py-2 whitespace-nowrap";
        const notesBtn = document.createElement("button");
        notesBtn.type = "button";
        notesBtn.className =
            "admin-note-btn text-xs text-gray-700 border border-gray-300 rounded-sm px-2 py-1 hover:bg-gray-100 transition-colors duration-300";
        notesBtn.dataset.appId = app.id;
        notesBtn.textContent = app.internalNote && app.internalNote.trim() !== ""
            ? "Ver / editar"
            : "Agregar nota";
        tdNotes.appendChild(notesBtn);

        tr.appendChild(tdDate);
        tr.appendChild(tdTime);
        tr.appendChild(tdFolio);
        tr.appendChild(tdClient);
        tr.appendChild(tdPhone);
        tr.appendChild(tdAddress);
        tr.appendChild(tdAmount);
        tr.appendChild(tdJobStatus);
        tr.appendChild(tdPaymentStatus);
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

    if (method === "tarjeta") {
        const cardHolder = document.getElementById("cardHolder");
        const cardNumber = document.getElementById("cardNumber");
        const cardExpiry = document.getElementById("cardExpiry");
        const cardCvv = document.getElementById("cardCvv");

        if (!cardHolder.value || !cardNumber.value || !cardExpiry.value || !cardCvv.value) {
            showNotification("Completa todos los datos de la tarjeta para registrar el pago.");
            return;
        }
    }

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

        if (currentAppointment) {
            currentAppointment.status = "Con pago registrado";
        }

        const appIndex = appointments.findIndex(a => a.id === payment.appointmentId);
        if (appIndex !== -1) {
            appointments[appIndex].status = "Con pago registrado";
            appointments[appIndex].estimatedAmount = payment.amount;
        }

        renderPaymentsTable();
        renderAppointmentsTable();

        showNotification("Pago registrado de manera simulada en la base de datos.");
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
            appointments.push({
                id: a.id,
                folio: generateAppointmentFolio(a.id, a.date),
                date: a.date,
                time: a.time,
                clientName: a.clientName,
                phone: a.phone,
                email: a.email,
                address: a.address,
                comments: a.comments,
                estimatedAmount: a.estimatedAmount,
                status: a.status,
                jobStatus: "Pendiente de visita",
                internalNote: ""
            });
        });

        renderAppointmentsTable();

    } catch (error) {
        console.error("Error loadAppointmentsFromServer:", error);
        showNotification("Error al comunicar con el servidor para cargar citas.");
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

    // Listeners para filtros del panel admin
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
