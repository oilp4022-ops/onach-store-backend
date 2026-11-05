export class DOM {
    static formatPrice(amount) {
        return `$${(parseFloat(amount) || 0).toFixed(2)}`;
    }

    static getImageUrl(img) {
        const src = img || 'placeholder.jpg';
        return (src.startsWith('http') || src.includes('imagenes/')) ? src : `imagenes/${src}`;
    }

    // Práctica 2: Skeleton Screens
    static renderSkeleton(container, count = 4) {
        if (!container) return;
        container.innerHTML = Array(count).fill('<div class="skeleton"></div>').join('');
    }

    static renderProducts(products, container) {
        if (!container) return;
        if (products.length === 0) {
            container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No hay productos disponibles.</p>';
            return;
        }
        
        container.innerHTML = products.map(p => `
            <div class="product-card">
                <div class="product-image-container">
                    <img src="${this.getImageUrl(p.image)}" alt="${p.nombre}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <p class="price">${this.formatPrice(p.precio)}</p>
                </div>
                <div class="product-actions">
                    <a href="product.html?id=${p.id}" class="btn-detail-add" style="text-decoration: none; padding: 0.5rem 1rem;">Ver Detalles</a>
                </div>
            </div>
        `).join('');
    }

    static initGlobalUI() {
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const overlay = document.getElementById('overlay');
        const closeMenuBtn = document.getElementById('close-menu-btn');

        if (hamburgerBtn) hamburgerBtn.addEventListener('click', () => { mobileMenu.classList.add('active'); overlay.classList.add('active'); });
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => { mobileMenu.classList.remove('active'); overlay.classList.remove('active'); });
        if (overlay) overlay.addEventListener('click', () => { mobileMenu.classList.remove('active'); overlay.classList.remove('active'); });

        const userName = localStorage.getItem('userName');
        const userNameDisplay = document.getElementById('user-display-name');
        if (userName && userNameDisplay) userNameDisplay.textContent = `Hola, ${userName}`;
        
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'admin') {
            document.querySelectorAll('#admin-link-desktop, #admin-link-mobile').forEach(el => el.style.display = 'block');
        }
    }
}