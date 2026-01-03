(() => {
    "use strict";

    const STORAGE_KEYS = {
        SERVICES: "admin_services",
        EVENTS: "admin_events",
        SECTIONS: "admin_sections"  
    };

    const SCROLL_OFFSET = 80;

    const escapeHTML = (text = "") => {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    };

    const getJSON = (key) => {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch {
            return [];
        }
    };

    /* ===================== UI DE SCROLL Y NAVEGACIÓN SUAVE ===================== */

    const header = document.querySelector("header");
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".menu a");

    const onScrollUI = () => {
        if (header) {
            header.classList.toggle("scrolled", window.scrollY > 50);
        }

        let current = "";
        sections.forEach(sec => {
            const top = sec.offsetTop - 200;
            if (window.scrollY >= top) current = sec.id;
        });

        navLinks.forEach(link => {
            link.classList.toggle(
                "active",
                link.getAttribute("href") === `#${current}`
            );
        });
    };

    const setupSmoothScroll = () => {
        document.addEventListener("click", e => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;

            const target = document.querySelector(link.getAttribute("href"));
            if (!target) return;

            e.preventDefault();
            window.scrollTo({
                top: target.offsetTop - SCROLL_OFFSET,
                behavior: "smooth"
            });
        });
    };

    /* ===================== SERVICIOS ===================== */

    const loadServices = () => {
        const grid = document.getElementById("servicesGrid");
        if (!grid) return;

        const services = getJSON(STORAGE_KEYS.SERVICES)
            .filter(s => s.visible !== false);

        if (!services.length) {
            grid.innerHTML = `
                <article class="service-card empty-service">
                    <div class="service-icon" style="background-image:url('img/ola-verde.png')"></div>
                    <h3>Nuestros Servicios</h3>
                    <p>Estamos preparando nuevos servicios para vos.</p>
                </article>
            `;
            return;
        }

        grid.innerHTML = services.map(s => {
            const icon = s.iconType === "custom" && s.icon
                ? escapeHTML(s.icon)
                : "img/ola-verde.png";

            return `
                <article class="service-card">
                    <div class="service-icon" style="background-image:url('${icon}')"></div>
                    <h3>${escapeHTML(s.title)}</h3>
                    <p>${escapeHTML(s.desc)}</p>
                </article>
            `;
        }).join("");
    };

    /* ===================== SECCIONES E ÍTEMS ===================== */

    const loadAccordion = () => {
        const container = document.getElementById("MoreInfoAccordion");
        if (!container) return;

        const sections = getJSON(STORAGE_KEYS.SECTIONS, [])
            .filter(s => s.visible !== false);

        if (!sections.length) {
            container.innerHTML = `
            <div class="sections-empty-state">
                <h3>Explorá Nuestras Propuestas</h3>
                <p>Estamos preparando contenido especial para tu desarrollo profesional.</p>
            </div>
        `;
            return;
        }

        container.innerHTML = sections.map(section => {
            // Filtrar ítems visibles
            const visibleItems = section.items ?
                section.items.filter(item => item.visible !== false) : [];

            if (visibleItems.length === 0) {
                // No mostrar sección sin ítems visibles
                return ''; 
            }

            return `
            <div class="section-modern">
                <button class="section-header-modern" aria-expanded="false">
                    <h3>${escapeHTML(section.title)}</h3>
                    <span class="section-icon-modern">+</span>
                </button>
                <div class="section-content-modern" style="max-height: 0; overflow: hidden;">
                    <div class="items-container-modern">
                        ${visibleItems.map(item => `
                            <div class="item-modern">
                                <h4>${escapeHTML(item.subtitle)}</h4>
                                <div class="item-details-modern">
                                    <p class="main-proposal-modern">${escapeHTML(item.description || '')}</p>
                                    ${(item.dedicacion || item.modalidad) ? `
                                        <div class="proposal-meta-modern">
                                            ${item.dedicacion ? `<p><strong>Dedicación:</strong> ${escapeHTML(item.dedicacion)}</p>` : ''}
                                            ${item.modalidad ? `<p><strong>Modalidad:</strong> ${escapeHTML(item.modalidad)}</p>` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        }).filter(html => html !== '').join('');

        // Configurar eventos de acordeón
        container.querySelectorAll('.section-header-modern').forEach(button => {
            button.addEventListener('click', () => {
                const isExpanded = button.getAttribute('aria-expanded') === 'true';
                button.setAttribute('aria-expanded', !isExpanded);
                const content = button.nextElementSibling;
                const icon = button.querySelector('.section-icon-modern');

                if (isExpanded) {
                    content.style.maxHeight = '0';
                    icon.textContent = '+';
                } else {
                    content.style.maxHeight = content.scrollHeight + 'px';
                    icon.textContent = '−';
                }
            });
        });

        container.querySelectorAll('.section-content-modern').forEach(content => {
            content.style.maxHeight = content.scrollHeight + 40 + 'px';
        });
    };

    /* ===================== TRAYECTO ===================== */

    class Trayecto {
        constructor() {
            this.tracks = [
                { el: document.getElementById("trayectoTrackTop"), speed: 25 },
                { el: document.getElementById("trayectoTrackMiddle"), speed: 35 },
                { el: document.getElementById("trayectoTrackBottom"), speed: 30 }
            ];

            this.gallery = document.querySelector(".trayecto-gallery");
            this.counter = document.getElementById("trayectoCounter");

            this.events = [];
            this.rafIds = [];
        }

        init() {
            if (!this.gallery) return;

            this.events = getJSON(STORAGE_KEYS.EVENTS)
                .filter(e => e.visible !== false);

            if (this.counter) {
                this.counter.textContent = this.events.length;
            }

            if (!this.events.length) {
                this.renderEmpty();
                return;
            }

            this.renderTracks();
            this.waitForLayout().then(() => this.startAnimations());
            this.bindClicks();
        }

        renderEmpty() {
            this.gallery.innerHTML = `
            <div class="trayecto-empty">
                <h3>¡Nuestro viaje está comenzando!</h3>
                <p>Pronto compartiremos experiencias increíbles.</p>
            </div>
        `;
        }

        renderTracks() {
            this.tracks.forEach(track => {
                if (!track.el) return;

                const duplicated = [...this.events, ...this.events];
                track.el.innerHTML = duplicated.map(e => this.cardHTML(e)).join("");
                track.el.style.transform = "translate3d(0,0,0)";
            });
        }

        cardHTML(event) {
            const img = escapeHTML(event.image || "img/event-placeholder.jpg");
            return `
            <div class="trayecto-card">
                <img src="${img}" loading="lazy"
                     onerror="this.src='img/event-placeholder.jpg'">
                <div class="trayecto-overlay">
                    <h4>${escapeHTML(event.title)}</h4>
                    ${event.subtitle ? `<p>${escapeHTML(event.subtitle)}</p>` : ""}
                </div>
            </div>
        `;
        }

        async waitForLayout() {
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            const images = this.gallery.querySelectorAll("img");
            await Promise.all([...images].map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(res => {
                    img.onload = img.onerror = res;
                });
            }));
        }
        

        startAnimations() {
            this.tracks.forEach(track => {
                if (!track.el) return;

                const halfWidth = track.el.scrollWidth / 2;
                let x = 0;
                let last = performance.now();
                let paused = false;

                const animate = (time) => {
                    const delta = (time - last) / 1000;
                    last = time;

                    if (!paused) {
                        x -= track.speed * delta;

                        if (x <= -halfWidth) {
                            x += halfWidth;
                        }

                        track.el.style.transform = `translate3d(${x}px,0,0)`;
                    }

                    track.raf = requestAnimationFrame(animate);
                };

                track.el.addEventListener("mouseenter", () => paused = true);
                track.el.addEventListener("mouseleave", () => paused = false);

                track.raf = requestAnimationFrame(animate);
                this.rafIds.push(track.raf);
            });
        }

        bindClicks() {
            this.gallery.addEventListener("click", e => {
                const card = e.target.closest(".trayecto-card");
                if (!card) return;

                const cards = [...this.gallery.querySelectorAll(".trayecto-card")];
                const index = cards.indexOf(card) % this.events.length;
                const event = this.events[index];

                if (event?.image) {
                    window.open(event.image, "_blank", "noopener,noreferrer");
                }
            });
        }

        destroy() {
            this.tracks.forEach(track => {
                if (track.raf) cancelAnimationFrame(track.raf);
            });
        }
    }


    const setupCTAEvents = () => {
        const ctaButton = document.querySelector('.cta-button');
        if (ctaButton) {
            ctaButton.addEventListener('click', () => {
                window.scrollTo({
                    top: document.getElementById('contact').offsetTop - SCROLL_OFFSET,
                    behavior: 'smooth'
                });
            });
        }
    };

    /* ===================== INIT ===================== */

    const init = () => {
        setupSmoothScroll();
        setupCTAEvents();
        loadServices();
        loadAccordion();

        const trayecto = new Trayecto();
        trayecto.init();

        window.addEventListener("scroll", onScrollUI);
        window.addEventListener("storage", e => {
            if (e.key === STORAGE_KEYS.SERVICES) {
                loadServices();
            }
            if (e.key === STORAGE_KEYS.EVENTS) {
                trayecto.destroy();
                trayecto.init();
            }
            if (e.key === STORAGE_KEYS.SECTIONS) {
                loadAccordion();
            }
        });

        onScrollUI();
        console.log("✅ UMI Consultoría inicializado correctamente.");
    };

    document.readyState === "loading"
        ? document.addEventListener("DOMContentLoaded", init)
        : init();

})();