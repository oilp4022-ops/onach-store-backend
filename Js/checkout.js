import { API } from './api.js';
import { DOM } from './dom.js';

document.addEventListener('DOMContentLoaded', async () => {
    DOM.initGlobalUI();
    
    // Si no está logueado, lo mandamos al login
    if (!API.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const cartData = await API.request('/cart');
        if (cartData.length === 0) {
            alert('Tu carrito está vacío.');
            window.location.href = 'index.html';
            return;
        }

        const list = document.getElementById('checkout-items-list');
        let subtotal = 0;

        // Pintar los productos en el resumen
        if (list) {
            list.innerHTML = cartData.map(item => {
                const totalItem = item.precio * item.cantidad;
                subtotal += totalItem;
                return `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                        <span>${item.cantidad}x ${item.nombre} (Talla: ${item.talla})</span>
                        <span style="font-weight: bold;">${DOM.formatPrice(totalItem)}</span>
                    </div>
                `;
            }).join('');
        }

        const shipping = subtotal > 0 ? 150 : 0; // Envío fijo de $150 MXN
        
        // Actualizar totales
        document.getElementById('checkout-subtotal').textContent = DOM.formatPrice(subtotal);
        document.getElementById('checkout-shipping').textContent = DOM.formatPrice(shipping);
        document.getElementById('checkout-grand-total').textContent = DOM.formatPrice(subtotal + shipping);

        // Lógica del botón de pagar
        const btnPlaceOrder = document.getElementById('place-order-btn');
        if (btnPlaceOrder) {
            btnPlaceOrder.addEventListener('click', async (e) => {
                e.preventDefault();
                btnPlaceOrder.disabled = true;
                btnPlaceOrder.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando pago...';

                try {
                    await API.request('/orders', 'POST', { total: subtotal + shipping });
                    alert("¡Pedido realizado con éxito! Gracias por tu compra en Onach Urban Store.");
                    window.location.href = 'index.html'; // Lo regresamos al inicio
                } catch (err) {
                    alert("Hubo un error al procesar el pedido.");
                    btnPlaceOrder.disabled = false;
                    btnPlaceOrder.textContent = "Realizar Pedido";
                }
            });
        }
    } catch (error) {
        console.error("Error cargando el checkout", error);
    }
});