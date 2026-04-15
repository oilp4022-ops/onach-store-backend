import { API } from './api.js';
import { DOM } from './dom.js';
import { Animations } from './animations.js';
import { Carousel } from './carousel.js';

// Inicialización Principal
const initTienda = async () => {
    DOM.initGlobalUI();
    Carousel.init('main-carousel');
    Animations.initMagneticButtons();
    
    initCartUI();
    await syncCart();

    // 1. LÓGICA SI ESTAMOS EN EL INICIO (index.html)
    const grid = document.getElementById('main-product-grid');
    if (grid) {
        DOM.renderSkeleton(grid, 8);
        try {
            const [productos] = await Promise.all([
                API.request('/productos', 'GET', null, true)
            ]);
            DOM.renderProducts(productos, grid);
            Animations.initScrollObserver();

            let lastCount = productos.length;
            API.startSmartPolling((newProducts) => {
                if (newProducts.length !== lastCount) {
                    DOM.renderProducts(newProducts, grid);
                    Animations.initScrollObserver();
                    lastCount = newProducts.length;
                }
            });
        } catch (error) {
            grid.innerHTML = '<p style="color:red; text-align:center;">Error al conectar con la base de datos.</p>';
        }
    }

    // 2. LÓGICA SI ESTAMOS EN EL DETALLE DE PRODUCTO (product.html)
    loadProductDetail();
};

// --- LÓGICA DE LA PÁGINA DE DETALLE ---
const loadProductDetail = async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const container = document.querySelector('.product-detail-container');
    
    // Si no hay ID o no estamos en la página de detalles, no hacemos nada
    if (!id || !container) return;

    try {
        const data = await API.request(`/productos/${id}`);
        const producto = data.producto;
        const variantes = data.variantes;

        // Llenar textos
        document.getElementById('detail-name').textContent = producto.nombre;
        document.getElementById('detail-price').textContent = DOM.formatPrice(producto.precio);
        document.getElementById('detail-description').textContent = producto.descripcion || 'Nueva prenda de temporada con estilo urbano exclusivo de Onach.';
        
        const imagenCorrecta = producto.imagen_url || producto.image;
        document.getElementById('product-images-container').innerHTML = `<img src="${DOM.getImageUrl(imagenCorrecta)}" alt="${producto.nombre}">`;

        // Lógica de Tallas
        const variantContainer = document.getElementById('variant-options');
        const addBtn = document.getElementById('add-to-cart-detail-btn');
        let selectedVariant = null;

        variantContainer.innerHTML = '';
        if (variantes.length > 0) {
            variantes.forEach(v => {
                const btn = document.createElement('button');
                btn.className = 'variant-btn';
                btn.textContent = v.talla;
                
                // Evento al dar clic en una talla
                btn.onclick = () => {
                    document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedVariant = v.id_variante;
                    document.getElementById('stock-info').textContent = `Stock disponible: ${v.stock} unidades`;
                    addBtn.disabled = false;
                    addBtn.innerHTML = '<i class="fas fa-shopping-bag"></i> Añadir al Carrito';
                };
                variantContainer.appendChild(btn);
            });
        } else {
            variantContainer.innerHTML = '<p style="color:red; font-weight:bold;">Agotado temporalmente</p>';
            addBtn.textContent = "Agotado";
        }

        // Evento al dar clic en "Añadir al carrito"
        addBtn.onclick = async () => {
            if (!selectedVariant) return;
            if (!API.getToken()) {
                alert("Por favor, inicia sesión para poder comprar.");
                window.location.href = 'login.html';
                return;
            }
            
            addBtn.disabled = true;
            addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Añadiendo...';
            
            try {
                await API.request('/cart', 'POST', { variantId: selectedVariant, quantity: 1 });
                await syncCart();
                // Abrir el carrito automáticamente
                document.getElementById('cart-modal').classList.add('active');
                document.getElementById('cart-overlay').classList.add('active');
            } catch(e) {
                alert("Error al añadir al carrito.");
            } finally {
                addBtn.disabled = false;
                addBtn.innerHTML = '<i class="fas fa-shopping-bag"></i> Añadir al Carrito';
            }
        };

        // Mostrar todo
        document.querySelector('.product-content-wrapper').style.display = 'grid';
        document.getElementById('loading-message').style.display = 'none';

    } catch (e) {
        document.getElementById('loading-message').innerHTML = '<span style="color:red;">Error al cargar el producto. Es posible que ya no exista en la tienda.</span>';
    }
};

// Ejecutamos la tienda
initTienda();

// --- LÓGICA DEL CARRITO GLOBAL ---
let cartData = [];

function initCartUI() {
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeCartBtn = document.querySelector('.close-cart-btn');
    const cartOverlay = document.getElementById('cart-overlay');
    
    // Capturamos el botón de pago
    const checkoutBtn = document.querySelector('.checkout-btn'); 

    if (cartBtn) cartBtn.addEventListener('click', () => { cartModal.classList.add('active'); cartOverlay.classList.add('active'); });
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => { cartModal.classList.remove('active'); cartOverlay.classList.remove('active'); });
    if (cartOverlay) cartOverlay.addEventListener('click', () => { cartModal.classList.remove('active'); cartOverlay.classList.remove('active'); });
    
    // LOGICA DE REDIRECCIÓN AL CHECKOUT
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cartData.length === 0) {
                alert("Tu carrito está vacío. Agrega productos antes de pagar.");
                return;
            }
            // Te redirige a la página de pago
            window.location.href = 'checkout.html';
        });
    }

    const clearCartBtn = document.querySelector('.clear-cart-btn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', async () => {
            if (confirm("¿Seguro que deseas vaciar todo el carrito?")) {
                for (let item of cartData) {
                    await API.request(`/cart/${item.id}`, 'DELETE');
                }
                await syncCart();
            }
        });
    }
}

async function syncCart() {
    const cartCountEl = document.querySelector('.cart-count');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalEl = document.getElementById('cart-total');
    
    if (!API.getToken()) {
        if (cartCountEl) cartCountEl.textContent = '0';
        return;
    }

    try {
        cartData = await API.request('/cart');
        
        const totalItems = cartData.reduce((sum, item) => sum + item.cantidad, 0);
        if (cartCountEl) cartCountEl.textContent = totalItems;

        if (cartItemsContainer) {
            if (cartData.length === 0) {
                cartItemsContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>';
            } else {
                cartItemsContainer.innerHTML = cartData.map(item => `
                    <div class="cart-item">
                        <img src="${DOM.getImageUrl(item.image)}" alt="${item.nombre}">
                        <div class="cart-item-details">
                            <h4>${item.nombre}</h4>
                            <p>Talla: <strong>${item.talla}</strong></p>
                            <p class="cart-item-price">${DOM.formatPrice(item.precio)}</p>
                            <div class="cart-item-quantity">Cant: ${item.cantidad}</div>
                        </div>
                        <button class="remove-item-btn" data-id="${item.id}">&times;</button>
                    </div>
                `).join('');

                document.querySelectorAll('.remove-item-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        await API.request(`/cart/${id}`, 'DELETE');
                        syncCart();
                    });
                });
            }
        }

        if (cartTotalEl) {
            const total = cartData.reduce((sum, item) => sum + (parseFloat(item.precio) * item.cantidad), 0);
            cartTotalEl.textContent = DOM.formatPrice(total);
        }
    } catch (err) { console.error("Error sincronizando carrito"); }
}