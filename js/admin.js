// ================= CONSTANTES Y CONFIGURACIÓN =================
const STORAGE_KEYS = {
    SERVICES: 'admin_services',
    SECTIONS: 'admin_sections',
    EVENTS: 'admin_events',
    LOGIN_SESSION: 'admin_logged_in'
};

const MODAL_TYPES = {
    SERVICE: 'service',
    SECTION: 'section',
    INFO_ITEM: 'info_item',
    EVENT: 'event'
};

const TOAST_DURATION = 5000;
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// CREDENCIALES DE LOGIN !!!
const LOGIN_CREDENTIALS = {
    USERNAME: 'umi_admin',
    PASSWORD: 'UmiConsultoria2024!'
};

// ================= ESTADO GLOBAL =================
const AppState = {
    currentPanel: 'dashboard',
    currentModal: null,
    editingIndex: null,
    editingType: null,
    currentSectionId: null,
    currentItemIndex: null,
    isProcessing: false,
    services: [],
    sections: [],
    events: [],
    toastContainer: null,
    isLoggedIn: false
};

// ================= SISTEMA DE LOGIN =================

function validateLogin(username, password) {
    return username === LOGIN_CREDENTIALS.USERNAME &&
        password === LOGIN_CREDENTIALS.PASSWORD;
}

function checkLoginStatus() {
    try {
        const loggedIn = sessionStorage.getItem(STORAGE_KEYS.LOGIN_SESSION);
        return loggedIn === 'true';
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        return false;
    }
}


function handleLogin(event) {
    if (event) event.preventDefault();

    if (AppState.isProcessing) return;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    let isValid = true;

    if (!username) {
        document.getElementById('usernameError').classList.add('show');
        document.getElementById('username').classList.add('input-error');
        isValid = false;
    } else {
        document.getElementById('usernameError').classList.remove('show');
        document.getElementById('username').classList.remove('input-error');
    }

    if (!password) {
        document.getElementById('passwordError').classList.add('show');
        document.getElementById('password').classList.add('input-error');
        isValid = false;
    } else {
        document.getElementById('passwordError').classList.remove('show');
        document.getElementById('password').classList.remove('input-error');
    }

    if (!isValid) {
        showToast('Por favor, completa todos los campos', 'error');
        return;
    }

    AppState.isProcessing = true;

    // Mostrar estado de carga
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span class="loading"></span> Verificando...';
    loginBtn.disabled = true;

    setTimeout(() => {
        if (validateLogin(username, password)) {
            // Login exitoso
            sessionStorage.setItem(STORAGE_KEYS.LOGIN_SESSION, 'true');
            AppState.isLoggedIn = true;
            showAdminPanel();
            showToast('Acceso concedido. Bienvenido al panel de administración.', 'success');

            document.getElementById('currentUser').textContent = username;
        } else {
            // Login fallido
            showToast('Credenciales incorrectas. Intenta nuevamente.', 'error');
            document.getElementById('password').value = '';
            document.getElementById('password').focus();

            const loginForm = document.getElementById('loginForm');
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        }

        AppState.isProcessing = false;
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }, 800);
}


function showAdminPanel() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'flex';

    // Inicializar el panel
    initAdminPanel();
}

// Cierra la sesión
function logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        sessionStorage.removeItem(STORAGE_KEYS.LOGIN_SESSION);
        AppState.isLoggedIn = false;

        // Mostrar login
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('adminContainer').style.display = 'none';

        // Limpiar formulario de login
        document.getElementById('loginForm').reset();
        document.getElementById('username').focus();

        showToast('Sesión cerrada correctamente', 'success');
    }
}

// Inicializa el panel de administración
function initAdminPanel() {
    // Cargar datos iniciales
    AppState.services = getStoredData(STORAGE_KEYS.SERVICES);
    AppState.events = getStoredData(STORAGE_KEYS.EVENTS);
    AppState.sections = getStoredData(STORAGE_KEYS.SECTIONS, []);

    renderServices();
    renderEvents();
    renderSections();
    updateCounters();

    setupAdminEventListeners();
}

// ================= FUNCIONES DE UTILIDAD =================

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStoredData(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error(`Error al leer ${key}:`, error);
        showToast('Error al cargar datos almacenados', 'error');
        return defaultValue;
    }
}


function setStoredData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error(`Error al guardar ${key}:`, error);
        showToast('Error al guardar los datos', 'error');
        return false;
    }
}

function generateId(prefix = '') {
    return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        if (!VALID_IMAGE_TYPES.includes(file.type)) {
            showToast('Formato de imagen no válido. Use JPEG, PNG, GIF, WebP o SVG.', 'error');
            resolve(null);
            return;
        }

        // Validar tamaño
        if (file.size > MAX_FILE_SIZE) {
            showToast('La imagen es demasiado grande. Máximo 2GB.', 'error');
            resolve(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
    });
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

// ================= SISTEMA DE NOTIFICACIONES =================

function createToastContainer() {
    if (!AppState.toastContainer) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.id = 'toastContainer';
        container.setAttribute('role', 'region');
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
        AppState.toastContainer = container;
    }
    return AppState.toastContainer;
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

function showToast(message, type = 'info', duration = TOAST_DURATION) {
    const container = createToastContainer();
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();

    toast.id = toastId;
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}" aria-hidden="true"></i>
        <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
            toastElement.classList.add('fade-out');
            setTimeout(() => toastElement.remove(), 300);
        }
    }, duration);

    return toast;
}

// ================= VALIDACIÓN DE FORMULARIOS =================

function validateField(input, errorElement, customValidation = null) {
    let isValid = true;
    const value = input.value.trim();

    if (input.hasAttribute('required') && value.length === 0) {
        isValid = false;
    }

    if (customValidation && isValid) {
        isValid = customValidation(value);
    }

    if (!isValid) {
        input.classList.add('input-error');
        if (errorElement) errorElement.classList.add('show');
        input.setAttribute('aria-invalid', 'true');
    } else {
        input.classList.remove('input-error');
        if (errorElement) errorElement.classList.remove('show');
        input.setAttribute('aria-invalid', 'false');
    }

    return isValid;
}


function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return true;

    const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;

    requiredInputs.forEach(input => {
        const errorId = input.id + 'Error';
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            if (!validateField(input, errorElement)) {
                isValid = false;
            }
        }
    });

    return isValid;
}


function showPanel(panelId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-current', null);
    });

    const navItem = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
    if (navItem) {
        navItem.classList.add('active');
        navItem.setAttribute('aria-current', 'page');
    }

    document.querySelectorAll('.panel-content').forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
    });

    const activePanel = document.getElementById(panelId + 'Panel');
    if (activePanel) {
        activePanel.classList.add('active');
        activePanel.style.display = 'block';
        AppState.currentPanel = panelId;

        if (panelId === 'dashboard') {
            updateCounters();
        }

        if (panelId === 'services') {
            renderServices();
        } else if (panelId === 'content') {
            renderEvents();
        } else if (panelId === 'MoreInfo') {
            renderSections();
        }

        setTimeout(() => {
            const focusable = activePanel.querySelector('button, input, [tabindex]:not([tabindex="-1"])');
            if (focusable) focusable.focus();
        }, 100);
    }

    if (window.innerWidth <= 480) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

function updateCounters() {
    const services = getStoredData(STORAGE_KEYS.SERVICES);
    const events = getStoredData(STORAGE_KEYS.EVENTS);
    const sections = getStoredData(STORAGE_KEYS.SECTIONS, []);

    // Contar servicios visibles
    const visibleServices = services.filter(s => s.visible !== false).length;
    const servicesCount = document.getElementById('servicesCount');
    if (servicesCount) {
        servicesCount.textContent = visibleServices;
    }

    // Contar eventos visibles
    const visibleEvents = events.filter(e => e.visible !== false).length;
    const contentCount = document.getElementById('contentCount');
    if (contentCount) {
        contentCount.textContent = visibleEvents;
    }

    // Contar secciones visibles y ítems visibles
    let visibleSections = 0;
    let totalVisibleItems = 0;

    sections.forEach(section => {
        if (section.visible !== false) {
            visibleSections++;
            if (section.items) {
                totalVisibleItems += section.items.filter(item => item.visible !== false).length;
            }
        }
    });

    const moreInfoCount = document.getElementById('moreInfoCount');
    if (moreInfoCount) {
        moreInfoCount.textContent = visibleSections;
    }
}

// ================= GESTIÓN DE SERVICIOS =================

function openServiceModal(editIndex = null) {
    const modal = document.getElementById('serviceModal');
    const titleField = document.getElementById('serviceTitle');
    const descField = document.getElementById('serviceDesc');
    const preview = document.getElementById('servicePreview');

    document.getElementById('serviceForm').reset();
    preview.style.display = 'none';
    preview.src = '';
    document.getElementById('serviceFileName').textContent = 'No se ha seleccionado ninguna imagen';
    document.getElementById('serviceFileWrap').style.display = 'none';
    document.querySelector('input[name="iconType"][value="default"]').checked = true;

    document.querySelectorAll('#serviceForm .error-message').forEach(el => {
        el.classList.remove('show');
    });
    document.querySelectorAll('#serviceForm .input-error').forEach(el => {
        el.classList.remove('input-error');
    });

    if (editIndex !== null) {
        const services = getStoredData(STORAGE_KEYS.SERVICES);
        const service = services[editIndex];

        if (service) {
            AppState.editingIndex = editIndex;
            AppState.editingType = MODAL_TYPES.SERVICE;

            document.getElementById('serviceModalTitle').textContent = 'Editar Servicio';
            document.getElementById('serviceSaveBtn').innerHTML = '<i class="fas fa-save" aria-hidden="true"></i> Actualizar Servicio';

            titleField.value = service.title || '';
            descField.value = service.desc || '';
            document.getElementById('serviceVisible').checked = service.visible !== false;

            if (service.iconType === 'custom' && service.icon) {
                document.querySelector('input[name="iconType"][value="custom"]').checked = true;
                document.getElementById('serviceFileWrap').style.display = 'block';
                preview.src = service.icon;
                preview.style.display = 'block';
                document.getElementById('serviceFileName').textContent = 'Imagen actual';
            }
        }
    } else {
        AppState.editingIndex = null;
        AppState.editingType = MODAL_TYPES.SERVICE;
        document.getElementById('serviceModalTitle').textContent = 'Nuevo Servicio';
        document.getElementById('serviceSaveBtn').innerHTML = '<i class="fas fa-save" aria-hidden="true"></i> Guardar Servicio';
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    AppState.currentModal = MODAL_TYPES.SERVICE;

    setTimeout(() => titleField.focus(), 100);
}

function closeServiceModal() {
    const modal = document.getElementById('serviceModal');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    AppState.currentModal = null;
    AppState.editingIndex = null;
    AppState.editingType = null;
}

async function saveService(event) {
    if (event) event.preventDefault();

    if (AppState.isProcessing) return;
    if (!validateForm('serviceForm')) return;

    AppState.isProcessing = true;

    const saveBtn = document.getElementById('serviceSaveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="loading"></span> Procesando...';
    saveBtn.disabled = true;

    try {
        const title = document.getElementById('serviceTitle').value.trim();
        const desc = document.getElementById('serviceDesc').value.trim();
        const visible = document.getElementById('serviceVisible').checked;
        const iconType = document.querySelector('input[name="iconType"]:checked').value;

        let icon = null;
        if (iconType === 'custom') {
            const fileInput = document.getElementById('serviceIcon');
            if (fileInput.files.length > 0) {
                icon = await readFileAsDataURL(fileInput.files[0]);
                if (!icon) {
                    throw new Error('Error al procesar la imagen');
                }
            } else if (AppState.editingIndex !== null) {
                const services = getStoredData(STORAGE_KEYS.SERVICES);
                icon = services[AppState.editingIndex]?.icon || null;
            }
        }

        const serviceData = {
            title,
            desc,
            iconType,
            icon,
            visible,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        let services = getStoredData(STORAGE_KEYS.SERVICES);

        if (AppState.editingIndex !== null) {
            serviceData.createdAt = services[AppState.editingIndex].createdAt;
            services[AppState.editingIndex] = serviceData;
            showToast('Servicio actualizado correctamente', 'success');
        } else {
            services.push(serviceData);
            showToast('Servicio creado correctamente', 'success');
        }

        if (setStoredData(STORAGE_KEYS.SERVICES, services)) {
            renderServices();
            updateCounters();
            closeServiceModal();
        }

    } catch (error) {
        console.error('Error al guardar servicio:', error);
        showToast(error.message || 'Error al guardar el servicio', 'error');
    } finally {
        AppState.isProcessing = false;
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function renderServices() {
    const grid = document.getElementById('servicesGrid');
    const services = getStoredData(STORAGE_KEYS.SERVICES);

    if (!services || services.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" role="alert" aria-label="No hay servicios">
                <i class="fas fa-concierge-bell fa-3x" style="color: #ccc; margin-bottom: 1rem;" aria-hidden="true"></i>
                <p>No hay servicios registrados</p>
                <button class="btn btn-primary" onclick="openServiceModal()" aria-label="Crear primer servicio">
                    <i class="fas fa-plus" aria-hidden="true"></i> Crear primer servicio
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = services.map((service, index) => `
        <div class="admin-card" role="listitem" aria-label="Servicio: ${escapeHTML(service.title)}">
            <div class="admin-preview">
                ${service.iconType === 'custom' && service.icon
            ? `<img src="${service.icon}" alt="${escapeHTML(service.title)}" loading="lazy">`
            : `<div class="default-icon" aria-hidden="true">${service.title ? service.title.charAt(0).toUpperCase() : 'S'}</div>`}
            </div>
            <div class="admin-card-content">
                <h4>${escapeHTML(service.title)}</h4>
                <p>${escapeHTML(service.desc)}</p>
                <div class="visibility-status">
                    <span class="visibility-badge ${service.visible !== false ? 'visible' : 'hidden'}" 
                          aria-label="${service.visible !== false ? 'Visible' : 'Oculto'}">
                        <i class="fas ${service.visible !== false ? 'fa-eye' : 'fa-eye-slash'}" aria-hidden="true"></i>
                        ${service.visible !== false ? 'Visible' : 'Oculto'}
                    </span>
                </div>
                <div class="admin-actions">
                    <button class="btn btn-edit" onclick="editService(${index})" 
                            aria-label="Editar servicio ${escapeHTML(service.title)}">
                        <i class="fas fa-edit" aria-hidden="true"></i> Editar
                    </button>
                    <button class="btn btn-toggle ${service.visible !== false ? 'visible' : 'hidden'}" 
                            onclick="toggleServiceVisibility(${index})"
                            aria-label="${service.visible !== false ? 'Ocultar' : 'Mostrar'} servicio ${escapeHTML(service.title)}">
                        <i class="fas ${service.visible !== false ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>
                        ${service.visible !== false ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button class="btn btn-danger" onclick="deleteService(${index})"
                            aria-label="Eliminar servicio ${escapeHTML(service.title)}">
                        <i class="fas fa-trash" aria-hidden="true"></i> Eliminar
                    </button>
                </div>
                <div class="visually-hidden">
                    Creado: ${formatDate(service.createdAt)} | 
                    Actualizado: ${formatDate(service.updatedAt)}
                </div>
            </div>
        </div>
    `).join('');
}

function editService(index) {
    openServiceModal(index);
}

function toggleServiceVisibility(index) {
    const services = getStoredData(STORAGE_KEYS.SERVICES);
    if (index >= 0 && index < services.length) {
        services[index].visible = !services[index].visible;
        services[index].updatedAt = new Date().toISOString();

        if (setStoredData(STORAGE_KEYS.SERVICES, services)) {
            renderServices();
            updateCounters();
            const status = services[index].visible ? 'visible' : 'oculto';
            showToast(`Servicio marcado como ${status}`, 'success');
        }
    }
}


function deleteService(index) {
    const services = getStoredData(STORAGE_KEYS.SERVICES);
    const service = services[index];

    if (!service) return;

    if (!confirm(`¿Está seguro de eliminar el servicio "${service.title}"?\nEsta acción no se puede deshacer.`)) {
        return;
    }

    if (index >= 0 && index < services.length) {
        services.splice(index, 1);

        if (setStoredData(STORAGE_KEYS.SERVICES, services)) {
            renderServices();
            updateCounters();
            showToast('Servicio eliminado correctamente', 'success');
        }
    }
}

// ================= GESTIÓN DE SECCIONES =================

function openSectionModal(editIndex = null) {
    const modal = document.getElementById('sectionModal');
    const titleField = document.getElementById('sectionTitle');

    document.getElementById('sectionForm').reset();

    document.getElementById('sectionTitleError').classList.remove('show');
    titleField.classList.remove('input-error');

    if (editIndex !== null) {
        const sections = getStoredData(STORAGE_KEYS.SECTIONS, []);
        const section = sections[editIndex];

        if (section) {
            AppState.editingIndex = editIndex;
            AppState.editingType = MODAL_TYPES.SECTION;

            document.getElementById('sectionModalTitle').textContent = 'Editar Sección';
            document.getElementById('sectionSaveBtn').innerHTML = '<i class="fas fa-save"></i> Actualizar Sección';

            titleField.value = section.title || '';
            document.getElementById('sectionVisible').checked = section.visible !== false;
        }
    } else {
        AppState.editingIndex = null;
        AppState.editingType = MODAL_TYPES.SECTION;
        document.getElementById('sectionModalTitle').textContent = 'Nueva Sección';
        document.getElementById('sectionSaveBtn').innerHTML = '<i class="fas fa-save"></i> Guardar Sección';
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    AppState.currentModal = MODAL_TYPES.SECTION;

    setTimeout(() => titleField.focus(), 100);
}


function closeSectionModal() {
    const modal = document.getElementById('sectionModal');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    AppState.currentModal = null;
    AppState.editingIndex = null;
    AppState.editingType = null;
}


function saveSection(event) {
    if (event) event.preventDefault();

    if (AppState.isProcessing) return;

    const title = document.getElementById('sectionTitle').value.trim();
    if (!title) {
        document.getElementById('sectionTitleError').classList.add('show');
        document.getElementById('sectionTitle').classList.add('input-error');
        showToast('El título es requerido', 'error');
        return;
    }

    AppState.isProcessing = true;

    const saveBtn = document.getElementById('sectionSaveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="loading"></span> Guardando...';
    saveBtn.disabled = true;

    try {
        const visible = document.getElementById('sectionVisible').checked;

        const sectionData = {
            id: generateId('section_'),
            title,
            visible,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        let sections = getStoredData(STORAGE_KEYS.SECTIONS, []);

        if (AppState.editingIndex !== null) {
            sectionData.id = sections[AppState.editingIndex].id;
            sectionData.items = sections[AppState.editingIndex].items || [];
            sectionData.createdAt = sections[AppState.editingIndex].createdAt;

            sections[AppState.editingIndex] = sectionData;
            showToast('Sección actualizada correctamente', 'success');
        } else {
            sections.push(sectionData);
            showToast('Sección creada correctamente', 'success');
        }

        if (setStoredData(STORAGE_KEYS.SECTIONS, sections)) {
            renderSections();
            updateCounters();
            closeSectionModal();
        }

    } catch (error) {
        console.error('Error al guardar sección:', error);
        showToast('Error al guardar la sección', 'error');
    } finally {
        AppState.isProcessing = false;
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function renderSections() {
    const grid = document.getElementById('sectionsGrid');
    const sections = getStoredData(STORAGE_KEYS.SECTIONS, []);

    if (!sections || sections.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" role="alert" aria-label="No hay secciones">
                <i class="fas fa-folder-open fa-3x" style="color: #ccc; margin-bottom: 1rem;" aria-hidden="true"></i>
                <h3>No hay secciones creadas</h3>
                <p>Crea tu primera sección para organizar información relacionada</p>
                <button class="btn btn-primary" onclick="openSectionModal()" aria-label="Crear primera sección">
                    <i class="fas fa-plus" aria-hidden="true"></i> Crear primera sección
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = sections.map((section, index) => {
        const itemCount = section.items ? section.items.length : 0;
        const visibleItems = section.items ? section.items.filter(item => item.visible !== false).length : 0;

        return `
        <div class="section-card-modern" role="article" aria-label="Sección: ${escapeHTML(section.title)}">
            <!-- Cabecera de la sección -->
            <div class="section-header-modern">
                <div class="section-title-area">
                    <div class="section-icon-modern" aria-hidden="true">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="section-title-content">
                        <h4>${escapeHTML(section.title)}</h4>
                        <div class="section-meta">
                            <div class="section-meta-item">
                                <i class="fas fa-file-alt"></i>
                                <span>${itemCount} ${itemCount === 1 ? 'ítem' : 'ítems'}</span>
                            </div>
                            <div class="section-meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Creada: ${formatDate(section.createdAt)}</span>
                            </div>
                            <div class="section-meta-item">
                                <span class="status-indicator ${section.visible !== false ? 'visible' : 'hidden'}">
                                    <i class="fas ${section.visible !== false ? 'fa-eye' : 'fa-eye-slash'}"></i>
                                    ${section.visible !== false ? 'Visible' : 'Oculto'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Botones de acción de la sección -->
                <div class="section-actions-modern">
                    <button class="btn btn-edit btn-sm" onclick="editSection(${index})" 
                            aria-label="Editar sección ${escapeHTML(section.title)}">
                        <i class="fas fa-edit" aria-hidden="true"></i> Editar
                    </button>
                    
                    <button class="btn btn-toggle btn-sm ${section.visible !== false ? 'visible' : 'hidden'}" 
                            onclick="toggleSectionVisibility(${index})"
                            aria-label="${section.visible !== false ? 'Ocultar' : 'Mostrar'} sección">
                        <i class="fas ${section.visible !== false ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>
                    </button>
                    
                    <button class="btn btn-primary btn-sm" onclick="openInfoItemModal('${section.id}', null)" 
                            aria-label="Añadir información a ${escapeHTML(section.title)}">
                        <i class="fas fa-plus" aria-hidden="true"></i> Nuevo Ítem
                    </button>
                    
                    <button class="btn btn-danger btn-sm" onclick="deleteSection(${index})"
                            aria-label="Eliminar sección ${escapeHTML(section.title)}">
                        <i class="fas fa-trash" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            
            <!-- Contenido de la sección -->
            <div class="section-content-modern">
                ${itemCount === 0 ? `
                    <div class="section-empty-state">
                        <i class="fas fa-info-circle" aria-hidden="true"></i>
                        <h5>Esta sección está vacía</h5>
                        <p>Agrega ítems de información para organizar contenido relacionado.</p>
                        <button class="btn btn-primary btn-sm" onclick="openInfoItemModal('${section.id}', null)">
                            <i class="fas fa-plus" aria-hidden="true"></i> Añadir primer ítem
                        </button>
                    </div>
                ` : `
                    <div class="items-count-badge">
                        <i class="fas fa-check-circle"></i> ${visibleItems} de ${itemCount} visibles
                    </div>
                    
                    <div class="items-grid-modern">
                        ${section.items.map((item, itemIndex) => `
                            <div class="item-card-modern" role="listitem" aria-label="Ítem: ${escapeHTML(item.subtitle || 'Sin título')}">
                                <div class="item-header-modern">
                                    <div class="item-title-modern">
                                        <h5>${escapeHTML(item.subtitle || 'Sin título')}</h5>
                                        <div class="item-subtitle-modern">
                                            ${item.modalidad || 'Sin modalidad específica'}
                                        </div>
                                    </div>
                                    <div class="item-controls-modern">
                                        <button class="btn btn-edit btn-sm" onclick="editInfoItem('${section.id}', ${itemIndex})" 
                                                aria-label="Editar ítem ${escapeHTML(item.subtitle || '')}">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-toggle btn-sm ${item.visible !== false ? 'visible' : 'hidden'}" 
                                                onclick="toggleItemVisibility('${section.id}', ${itemIndex})"
                                                aria-label="${item.visible !== false ? 'Ocultar' : 'Mostrar'} ítem">
                                            <i class="fas ${item.visible !== false ? 'fa-eye-slash' : 'fa-eye'}"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteInfoItem('${section.id}', ${itemIndex})"
                                                aria-label="Eliminar ítem ${escapeHTML(item.subtitle || '')}">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                ${item.description ? `
                                    <div class="item-description-modern">
                                        <p>${escapeHTML(item.description)}</p>
                                    </div>
                                ` : ''}
                                
                                <div class="item-details-modern">
                                    ${item.dedicacion ? `
                                        <div class="item-detail-modern">
                                            <i class="fas fa-clock"></i>
                                            <div class="item-detail-content">
                                                <span class="item-detail-label">Dedicación</span>
                                                <span class="item-detail-value">${escapeHTML(item.dedicacion)}</span>
                                            </div>
                                        </div>
                                    ` : ''}
                                    
                                    ${item.modalidad ? `
                                        <div class="item-detail-modern">
                                            <i class="fas fa-map-marker-alt"></i>
                                            <div class="item-detail-content">
                                                <span class="item-detail-label">Modalidad</span>
                                                <span class="item-detail-value">${escapeHTML(item.modalidad)}</span>
                                            </div>
                                        </div>
                                    ` : ''}
                                    
                                    <div class="item-detail-modern">
                                        <i class="fas ${item.visible !== false ? 'fa-eye' : 'fa-eye-slash'}"></i>
                                        <div class="item-detail-content">
                                            <span class="item-detail-label">Estado</span>
                                            <span class="item-detail-value">${item.visible !== false ? 'Visible' : 'Oculto'}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="item-detail-modern">
                                        <i class="fas fa-calendar"></i>
                                        <div class="item-detail-content">
                                            <span class="item-detail-label">Actualizado</span>
                                            <span class="item-detail-value">${formatDate(item.updatedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
        `;
    }).join('');
}

function editSection(index) {
    openSectionModal(index);
}

function toggleSectionVisibility(index) {
    const sections = getStoredData(STORAGE_KEYS.SECTIONS, []);
    if (index >= 0 && index < sections.length) {
        sections[index].visible = !sections[index].visible;
        sections[index].updatedAt = new Date().toISOString();

        if (setStoredData(STORAGE_KEYS.SECTIONS, sections)) {
            renderSections();
            updateCounters();
            const status = sections[index].visible ? 'visible' : 'oculta';
            showToast(`Sección marcada como ${status}`, 'success');
        }
    }
}


function deleteSection(index) {
    const sections = getStoredData(STORAGE_KEYS.SECTIONS, []);
    const section = sections[index];

    if (!section) return;

    if (!confirm(`¿Está seguro de eliminar la sección "${section.title}"?\n\nSe eliminarán todos los ${section.items ? section.items.length : 0} ítems de información contenidos.\nEsta acción no se puede deshacer.`)) {
        return;
    }

    if (index >= 0 && index < sections.length) {
        sections.splice(index, 1);

        if (setStoredData(STORAGE_KEYS.SECTIONS, sections)) {
            renderSections();
            updateCounters();
            showToast('Sección eliminada correctamente', 'success');
        }
    }
}

// ================= GESTIÓN DE ÍTEMS DE INFORMACIÓN =================

function openInfoItemModal(sectionId, itemIndex = null) {
    const modal = document.getElementById('infoItemModal');

    document.getElementById('currentSectionId').value = sectionId;
    AppState.currentSectionId = sectionId;
    AppState.currentItemIndex = itemIndex;

    document.getElementById('infoItemForm').reset();

    document.querySelectorAll('#infoItemForm .error-message').forEach(el => {
        el.classList.remove('show');
    });
    document.querySelectorAll('#infoItemForm .input-error').forEach(el => {
        el.classList.remove('input-error');
    });

    if (itemIndex !== null) {
        const sections = getStoredData(STORAGE_KEYS.SECTIONS, []);
        const section = sections.find(s => s.id === sectionId);

        if (section && section.items && section.items[itemIndex]) {
            const item = section.items[itemIndex];

            document.getElementById('infoItemModalTitle').textContent = 'Editar Información';
            document.getElementById('infoItemSaveBtn').innerHTML = '<i class="fas fa-save"></i> Actualizar Información';

            document.getElementById('infoItemSubtitle').value = item.subtitle || '';
            document.getElementById('infoItemDescription').value = item.description || '';
            document.getElementById('infoItemDedicacion').value = item.dedicacion || '';
            document.getElementById('infoItemModalidad').value = item.modalidad || '';
            document.getElementById('infoItemVisible').checked = item.visible !== false;
        }
    } else {
        document.getElementById('infoItemModalTitle').textContent = 'Nueva Información';
        document.getElementById('infoItemSaveBtn').innerHTML = '<i class="fas fa-save"></i> Guardar Información';
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    AppState.currentModal = MODAL_TYPES.INFO_ITEM;

    setTimeout(() => document.getElementById('infoItemSubtitle').focus(), 100);
}


function closeInfoItemModal() {
    const modal = document.getElementById('infoItemModal');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    AppState.currentModal = null;
    AppState.currentSectionId = null;
    AppState.currentItemIndex = null;
}

function saveInfoItem(event) {
    if (event) event.preventDefault();

    if (AppState.isProcessing) return;

    let isValid = true;
    const subtitle = document.getElementById('infoItemSubtitle');
    const description = document.getElementById('infoItemDescription');

    if (!subtitle.value.trim()) {
        subtitle.classList.add('input-error');
        document.getElementById('infoItemSubtitleError').classList.add('show');
        isValid = false;
    } else {
        subtitle.classList.remove('input-error');
        document.getElementById('infoItemSubtitleError').classList.remove('show');
    }

    if (!description.value.trim()) {
        description.classList.add('input-error');
        document.getElementById('infoItemDescriptionError').classList.add('show');
        isValid = false;
    } else {
        description.classList.remove('input-error');
        document.getElementById('infoItemDescriptionError').classList.remove('show');
    }

    if (!isValid) {
        showToast('Subtítulo y descripción son requeridos', 'error');
        return;
    }

    AppState.isProcessing = true;

    const saveBtn = document.getElementById('infoItemSaveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="loading"></span> Guardando...';
    saveBtn.disabled = true;

    try {
        const subtitleValue = subtitle.value.trim();
        const descriptionValue = description.value.trim();
        const dedicacion = document.getElementById('infoItemDedicacion').value.trim();
        const modalidad = document.getElementById('infoItemModalidad').value;
        const visible = document.getElementById('infoItemVisible').checked;
        const sectionId = document.getElementById('currentSectionId').value;

        const itemData = {
            id: generateId('item_'),
            subtitle: subtitleValue,
            description: descriptionValue,
            dedicacion: dedicacion || null,
            modalidad: modalidad || null,
            visible,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        let sections = getStoredData(STORAGE_KEYS.SECTIONS, []);
        const sectionIndex = sections.findIndex(s => s.id === sectionId);

        if (sectionIndex === -1) {
            throw new Error('Sección no encontrada');
        }

        if (!sections[sectionIndex].items) {
            sections[sectionIndex].items = [];
        }

        if (AppState.currentItemIndex !== null) {
            itemData.id = sections[sectionIndex].items[AppState.currentItemIndex].id;
            itemData.createdAt = sections[sectionIndex].items[AppState.currentItemIndex].createdAt;

            sections[sectionIndex].items[AppState.currentItemIndex] = itemData;
            showToast('Información actualizada correctamente', 'success');
        } else {
            sections[sectionIndex].items.push(itemData);
            showToast('Información creada correctamente', 'success');
        }

        sections[sectionIndex].updatedAt = new Date().toISOString();

        if (setStoredData(STORAGE_KEYS.SECTIONS, sections)) {
            renderSections();
            closeInfoItemModal();
        }

    } catch (error) {
        console.error('Error al guardar información:', error);
        showToast(error.message || 'Error al guardar la información', 'error');
    } finally {
        AppState.isProcessing = false;
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function editInfoItem(sectionId, itemIndex) {
    openInfoItemModal(sectionId, itemIndex);
}

function toggleItemVisibility(sectionId, itemIndex) {
    const sections = getStoredData(STORAGE_KEYS.SECTIONS, []);
    const sectionIndex = sections.findIndex(s => s.id === sectionId);

    if (sectionIndex !== -1 &&
        sections[sectionIndex].items &&
        itemIndex >= 0 &&
        itemIndex < sections[sectionIndex].items.length) {

        sections[sectionIndex].items[itemIndex].visible = !sections[sectionIndex].items[itemIndex].visible;
        sections[sectionIndex].items[itemIndex].updatedAt = new Date().toISOString();
        sections[sectionIndex].updatedAt = new Date().toISOString();

        if (setStoredData(STORAGE_KEYS.SECTIONS, sections)) {
            renderSections();
            const status = sections[sectionIndex].items[itemIndex].visible ? 'visible' : 'oculto';
            showToast(`Ítem marcado como ${status}`, 'success');
        }
    }
}

function deleteInfoItem(sectionId, itemIndex) {
    const sections = getStoredData(STORAGE_KEYS.SECTIONS, []);
    const sectionIndex = sections.findIndex(s => s.id === sectionId);

    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    const item = section.items && section.items[itemIndex];

    if (!item) return;

    if (!confirm(`¿Está seguro de eliminar el ítem "${item.subtitle}"?\nEsta acción no se puede deshacer.`)) {
        return;
    }

    if (itemIndex >= 0 && itemIndex < section.items.length) {
        section.items.splice(itemIndex, 1);
        section.updatedAt = new Date().toISOString();

        if (setStoredData(STORAGE_KEYS.SECTIONS, sections)) {
            renderSections();
            showToast('Ítem eliminado correctamente', 'success');
        }
    }
}

// ================= GESTIÓN DE CONTENIDO =================

function openEventModal(editIndex = null) {
    const modal = document.getElementById('eventModal');
    const titleField = document.getElementById('eventTitle');
    const subtitleField = document.getElementById('eventSubtitle');
    const preview = document.getElementById('eventPreview');

    document.getElementById('eventForm').reset();
    preview.style.display = 'none';
    preview.src = '';
    document.getElementById('eventFileName').textContent = 'No se ha seleccionado ninguna imagen';

    document.querySelectorAll('#eventForm .error-message').forEach(el => {
        el.classList.remove('show');
    });
    document.querySelectorAll('#eventForm .input-error').forEach(el => {
        el.classList.remove('input-error');
    });

    if (editIndex !== null) {
        const events = getStoredData(STORAGE_KEYS.EVENTS);
        const event = events[editIndex];

        if (event) {
            AppState.editingIndex = editIndex;
            AppState.editingType = MODAL_TYPES.EVENT;

            document.getElementById('eventModalTitle').textContent = 'Editar Contenido';
            document.getElementById('eventSaveBtn').innerHTML = '<i class="fas fa-save" aria-hidden="true"></i> Actualizar Contenido';

            titleField.value = event.title || '';
            subtitleField.value = event.subtitle || '';
            document.getElementById('eventVisible').checked = event.visible !== false;

            if (event.image) {
                preview.src = event.image;
                preview.style.display = 'block';
                document.getElementById('eventFileName').textContent = 'Imagen actual';
            }
        }
    } else {
        AppState.editingIndex = null;
        AppState.editingType = MODAL_TYPES.EVENT;
        document.getElementById('eventModalTitle').textContent = 'Nuevo Item de Contenido';
        document.getElementById('eventSaveBtn').innerHTML = '<i class="fas fa-save" aria-hidden="true"></i> Guardar Contenido';
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    AppState.currentModal = MODAL_TYPES.EVENT;

    setTimeout(() => titleField.focus(), 100);
}

function closeEventModal() {
    const modal = document.getElementById('eventModal');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    AppState.currentModal = null;
    AppState.editingIndex = null;
    AppState.editingType = null;
}

async function saveEvent(event) {
    if (event) event.preventDefault();

    if (AppState.isProcessing) return;
    if (!validateForm('eventForm')) return;

    AppState.isProcessing = true;

    const saveBtn = document.getElementById('eventSaveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="loading"></span> Procesando...';
    saveBtn.disabled = true;

    try {
        const title = document.getElementById('eventTitle').value.trim();
        const subtitle = document.getElementById('eventSubtitle').value.trim();
        const visible = document.getElementById('eventVisible').checked;

        let image = null;
        const fileInput = document.getElementById('eventImage');
        if (fileInput.files.length > 0) {
            image = await readFileAsDataURL(fileInput.files[0]);
            if (!image) {
                throw new Error('Error al procesar la imagen');
            }
        } else if (AppState.editingIndex !== null) {
            const events = getStoredData(STORAGE_KEYS.EVENTS);
            image = events[AppState.editingIndex]?.image || null;
        }

        const eventData = {
            title,
            subtitle,
            image,
            visible,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        let events = getStoredData(STORAGE_KEYS.EVENTS);

        if (AppState.editingIndex !== null) {
            eventData.createdAt = events[AppState.editingIndex].createdAt;
            events[AppState.editingIndex] = eventData;
            showToast('Contenido actualizado correctamente', 'success');
        } else {
            events.push(eventData);
            showToast('Contenido creado correctamente', 'success');
        }

        if (setStoredData(STORAGE_KEYS.EVENTS, events)) {
            renderEvents();
            updateCounters();
            closeEventModal();
        }

    } catch (error) {
        console.error('Error al guardar contenido:', error);
        showToast(error.message || 'Error al guardar el contenido', 'error');
    } finally {
        AppState.isProcessing = false;
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    const events = getStoredData(STORAGE_KEYS.EVENTS);

    if (!events || events.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" role="alert" aria-label="No hay contenido">
                <i class="fas fa-images fa-3x" style="color: #ccc; margin-bottom: 1rem;" aria-hidden="true"></i>
                <p>No hay contenido registrado</p>
                <button class="btn btn-primary" onclick="openEventModal()" aria-label="Crear primer contenido">
                    <i class="fas fa-plus" aria-hidden="true"></i> Crear primer contenido
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = events.map((event, index) => `
        <div class="admin-card" role="listitem" aria-label="Contenido: ${escapeHTML(event.title)}">
            <div class="admin-preview">
                ${event.image
            ? `<img src="${event.image}" alt="${escapeHTML(event.title)}" loading="lazy">`
            : `<div class="default-icon" style="background: linear-gradient(135deg, var(--info) 0%, #2196f3 100%);" aria-hidden="true">
                        <i class="fas fa-images"></i>
                       </div>`}
            </div>
            <div class="admin-card-content">
                <h4>${escapeHTML(event.title)}</h4>
                <p>${escapeHTML(event.subtitle)}</p>
                <div class="visibility-status">
                    <span class="visibility-badge ${event.visible !== false ? 'visible' : 'hidden'}" 
                          aria-label="${event.visible !== false ? 'Visible' : 'Oculto'}">
                        <i class="fas ${event.visible !== false ? 'fa-eye' : 'fa-eye-slash'}" aria-hidden="true"></i>
                        ${event.visible !== false ? 'Visible' : 'Oculto'}
                    </span>
                </div>
                <div class="admin-actions">
                    <button class="btn btn-edit" onclick="editEvent(${index})" 
                            aria-label="Editar contenido ${escapeHTML(event.title)}">
                        <i class="fas fa-edit" aria-hidden="true"></i> Editar
                    </button>
                    <button class="btn btn-toggle ${event.visible !== false ? 'visible' : 'hidden'}" 
                            onclick="toggleEventVisibility(${index})"
                            aria-label="${event.visible !== false ? 'Ocultar' : 'Mostrar'} contenido ${escapeHTML(event.title)}">
                        <i class="fas ${event.visible !== false ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>
                        ${event.visible !== false ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button class="btn btn-danger" onclick="deleteEvent(${index})"
                            aria-label="Eliminar contenido ${escapeHTML(event.title)}">
                        <i class="fas fa-trash" aria-hidden="true"></i> Eliminar
                    </button>
                </div>
                <div class="visually-hidden">
                    Creado: ${formatDate(event.createdAt)} | 
                    Actualizado: ${formatDate(event.updatedAt)}
                </div>
            </div>
        </div>
    `).join('');
}

function editEvent(index) {
    openEventModal(index);
}

function toggleEventVisibility(index) {
    const events = getStoredData(STORAGE_KEYS.EVENTS);
    if (index >= 0 && index < events.length) {
        events[index].visible = !events[index].visible;
        events[index].updatedAt = new Date().toISOString();

        if (setStoredData(STORAGE_KEYS.EVENTS, events)) {
            renderEvents();
            updateCounters();
            const status = events[index].visible ? 'visible' : 'oculto';
            showToast(`Contenido marcado como ${status}`, 'success');
        }
    }
}

function deleteEvent(index) {
    const events = getStoredData(STORAGE_KEYS.EVENTS);
    const event = events[index];

    if (!event) return;

    if (!confirm(`¿Está seguro de eliminar el contenido "${event.title}"?\nEsta acción no se puede deshacer.`)) {
        return;
    }

    if (index >= 0 && index < events.length) {
        events.splice(index, 1);

        if (setStoredData(STORAGE_KEYS.EVENTS, events)) {
            renderEvents();
            updateCounters();
            showToast('Contenido eliminado correctamente', 'success');
        }
    }
}

// ================= EVENTOS Y CONFIGURACIÓN =================

function handleIconTypeChange(event) {
    if (event.target.name === 'iconType') {
        const fileWrap = document.getElementById('serviceFileWrap');
        fileWrap.style.display = event.target.value === 'custom' ? 'block' : 'none';
    }
}

function handleImagePreview(event) {
    const file = event.target.files[0];

    let fileNameElement, previewElement;

    if (event.target.id === 'serviceIcon') {
        fileNameElement = document.getElementById('serviceFileName');
        previewElement = document.getElementById('servicePreview');
    } else if (event.target.id === 'eventImage') {
        fileNameElement = document.getElementById('eventFileName');
        previewElement = document.getElementById('eventPreview');
    } else {
        return;
    }

    if (file) {
        fileNameElement.textContent = file.name;

        const reader = new FileReader();
        reader.onload = function (event) {
            previewElement.src = event.target.result;
            previewElement.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function handleOutsideClick(event) {
    if (AppState.currentModal === MODAL_TYPES.SERVICE && event.target.id === 'serviceModal') {
        closeServiceModal();
    }
    if (AppState.currentModal === MODAL_TYPES.EVENT && event.target.id === 'eventModal') {
        closeEventModal();
    }
    if (AppState.currentModal === MODAL_TYPES.SECTION && event.target.id === 'sectionModal') {
        closeSectionModal();
    }
    if (AppState.currentModal === MODAL_TYPES.INFO_ITEM && event.target.id === 'infoItemModal') {
        closeInfoItemModal();
    }
}

function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        if (AppState.currentModal === MODAL_TYPES.SERVICE) {
            closeServiceModal();
        } else if (AppState.currentModal === MODAL_TYPES.EVENT) {
            closeEventModal();
        } else if (AppState.currentModal === MODAL_TYPES.SECTION) {
            closeSectionModal();
        } else if (AppState.currentModal === MODAL_TYPES.INFO_ITEM) {
            closeInfoItemModal();
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');

    const toggleBtn = document.getElementById('sidebarToggle');
    const icon = toggleBtn.querySelector('i');
    if (sidebar.classList.contains('active')) {
        icon.className = 'fas fa-times';
        toggleBtn.setAttribute('aria-expanded', 'true');
    } else {
        icon.className = 'fas fa-bars';
        toggleBtn.setAttribute('aria-expanded', 'false');
    }
}

function setupAdminEventListeners() {
    document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const panel = item.dataset.panel;
            if (panel) showPanel(panel);
        });
    });

    document.getElementById('newServiceBtn').addEventListener('click', () => openServiceModal());
    document.getElementById('newSectionBtn').addEventListener('click', () => openSectionModal());
    document.getElementById('newEventBtn').addEventListener('click', () => openEventModal());

    document.getElementById('closeServiceModal').addEventListener('click', closeServiceModal);
    document.getElementById('closeEventModal').addEventListener('click', closeEventModal);
    document.getElementById('closeSectionModal').addEventListener('click', closeSectionModal);
    document.getElementById('closeInfoItemModal').addEventListener('click', closeInfoItemModal);

    document.getElementById('cancelServiceBtn').addEventListener('click', closeServiceModal);
    document.getElementById('cancelEventBtn').addEventListener('click', closeEventModal);
    document.getElementById('cancelSectionBtn').addEventListener('click', closeSectionModal);
    document.getElementById('cancelInfoItemBtn').addEventListener('click', closeInfoItemModal);

    document.getElementById('serviceForm').addEventListener('submit', saveService);
    document.getElementById('eventForm').addEventListener('submit', saveEvent);
    document.getElementById('sectionForm').addEventListener('submit', saveSection);
    document.getElementById('infoItemForm').addEventListener('submit', saveInfoItem);

    document.querySelectorAll('input[name="iconType"]').forEach(input => {
        input.addEventListener('change', handleIconTypeChange);
    });

    document.getElementById('serviceIcon').addEventListener('change', handleImagePreview);
    document.getElementById('eventImage').addEventListener('change', handleImagePreview);

    document.getElementById('serviceTitle').addEventListener('blur', function () {
        validateField(this, document.getElementById('serviceTitleError'));
    });

    document.getElementById('serviceDesc').addEventListener('blur', function () {
        validateField(this, document.getElementById('serviceDescError'));
    });

    document.getElementById('eventTitle').addEventListener('blur', function () {
        validateField(this, document.getElementById('eventTitleError'));
    });

    document.getElementById('eventSubtitle').addEventListener('blur', function () {
        validateField(this, document.getElementById('eventSubtitleError'));
    });

    document.getElementById('sectionTitle').addEventListener('blur', function () {
        validateField(this, document.getElementById('sectionTitleError'));
    });

    document.getElementById('infoItemSubtitle').addEventListener('blur', function () {
        validateField(this, document.getElementById('infoItemSubtitleError'));
    });

    document.getElementById('infoItemDescription').addEventListener('blur', function () {
        validateField(this, document.getElementById('infoItemDescriptionError'));
    });

    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);

    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.addEventListener('click', handleOutsideClick);

    document.addEventListener('keydown', handleEscapeKey);

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');

        if (window.innerWidth <= 480 &&
            sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
            toggleBtn.querySelector('i').className = 'fas fa-bars';
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 480) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.remove('active');
            document.getElementById('sidebarToggle').querySelector('i').className = 'fas fa-bars';
            document.getElementById('sidebarToggle').setAttribute('aria-expanded', 'false');
        }
    });
}

function initLoginEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    document.getElementById('username').addEventListener('input', function () {
        if (this.value.trim()) {
            document.getElementById('usernameError').classList.remove('show');
            this.classList.remove('input-error');
        }
    });

    document.getElementById('password').addEventListener('input', function () {
        if (this.value.trim()) {
            document.getElementById('passwordError').classList.remove('show');
            this.classList.remove('input-error');
        }
    });

    document.getElementById('username').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('password').focus();
        }
    });

    document.getElementById('password').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });

    setTimeout(() => {
        document.getElementById('username').focus();
    }, 100);
}

// ================= INICIALIZACIÓN =================
function init() {
    console.log('🚀 Sistema de administración inicializado v4.1.0 (con secciones mejoradas)');

    createToastContainer();

    AppState.isLoggedIn = checkLoginStatus();

    if (AppState.isLoggedIn) {
        showAdminPanel();
        showToast('Sesión restaurada. Bienvenido de nuevo.', 'success');
    } else {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('adminContainer').style.display = 'none';

        initLoginEventListeners();

        setTimeout(() => {
            showToast('Ingresa tus credenciales para acceder al panel', 'info', 3000);
        }, 1000);
    }

    document.querySelectorAll('.btn').forEach(btn => {
        if (!btn.hasAttribute('aria-label')) {
            const text = btn.textContent.trim();
            if (text) btn.setAttribute('aria-label', text);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.openServiceModal = openServiceModal;
window.closeServiceModal = closeServiceModal;
window.saveService = saveService;
window.editService = editService;
window.toggleServiceVisibility = toggleServiceVisibility;
window.deleteService = deleteService;

window.openSectionModal = openSectionModal;
window.closeSectionModal = closeSectionModal;
window.saveSection = saveSection;
window.editSection = editSection;
window.toggleSectionVisibility = toggleSectionVisibility;
window.deleteSection = deleteSection;

window.openInfoItemModal = openInfoItemModal;
window.closeInfoItemModal = closeInfoItemModal;
window.saveInfoItem = saveInfoItem;
window.editInfoItem = editInfoItem;
window.toggleItemVisibility = toggleItemVisibility;
window.deleteInfoItem = deleteInfoItem;

window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.saveEvent = saveEvent;
window.editEvent = editEvent;
window.toggleEventVisibility = toggleEventVisibility;
window.deleteEvent = deleteEvent;

window.showPanel = showPanel;
window.logout = logout;
window.toggleSidebar = toggleSidebar;
window.handleIconTypeChange = handleIconTypeChange;
window.handleImagePreview = handleImagePreview;
window.validateField = validateField;
window.readFileAsDataURL = readFileAsDataURL;
window.formatDate = formatDate;
window.escapeHTML = escapeHTML;
window.showToast = showToast;