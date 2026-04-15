// js/ui.js
export class UI {
    static currentCurrency = 'MXN'; 
    static exchangeRate = 1; 

    static displayProducts(products) {
        const list = document.querySelector('#product-list');
        if (!list) return;
        
        list.innerHTML = ''; 
        products.forEach((product) => {
            UI.addProductToList(product);
        });
        
        const header = document.querySelector('#price-header');
        if (header) {
            header.textContent = UI.currentCurrency === 'MXN' ? 'Precio (MXN)' : 'Precio (USD)';
        }
    }

    static addProductToList(product) {
        const list = document.querySelector('#product-list');
        const row = document.createElement('tr');

        row.classList.add('animate-entry');
        row.classList.add('draggable');
        row.setAttribute('draggable', 'true');
        row.dataset.id = product.id; 

        // ¡AQUÍ ESTÁ LA CORRECCIÓN! Multiplicamos en lugar de dividir
        const displayPrice = (product.precio * UI.exchangeRate).toFixed(2);
        const currencySymbol = UI.currentCurrency === 'MXN' ? '$' : 'US$';

        const imgSrc = product.image ? (product.image.startsWith('http') ? product.image : `imagenes/${product.image}`) : 'imagenes/placeholder.jpg';

        row.innerHTML = `
            <td><img src="${imgSrc}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"></td>
            <td>${product.nombre}</td>
            <td>${currencySymbol}${displayPrice}</td>
            <td><span style="padding:3px 8px; background:#eee; border-radius:10px; font-size:0.8em;">${product.categoria}</span></td>
            <td class="actions">
                <button class="btn-edit" data-id="${product.id}">Editar</button>
                <button class="btn-delete" data-id="${product.id}">Eliminar</button>
            </td>
        `;
        list.appendChild(row);
    }

    static deleteProductFromUI(element) {
        const row = element.parentElement.parentElement;
        row.classList.add('animate-exit');
        row.addEventListener('animationend', () => {
            row.remove();
        });
    }

    static showAlert(message, className) {
        const div = document.querySelector('#alert-box');
        if (!div) return;
        div.className = `alert alert-${className} animate-entry`;
        div.textContent = message;
        div.style.display = 'block';

        setTimeout(() => {
            div.style.display = 'none';
            div.textContent = '';
        }, 3000);
    }

    static clearFields() {
        document.querySelector('#nombre').value = '';
        document.querySelector('#precio').value = '';
        document.querySelector('#categoria').value = 'playeras';
        document.querySelector('#product-id').value = '';
        document.querySelector('#imagen').value = '';
    }

    static fillForm(product) {
        document.querySelector('#nombre').value = product.nombre;
        document.querySelector('#precio').value = product.precio;
        document.querySelector('#categoria').value = product.categoria;
        document.querySelector('#product-id').value = product.id;
        document.querySelector('#imagen').value = product.image || '';
        
        document.querySelector('#form-title').textContent = 'Editar Producto';
        document.querySelector('.btn-form').textContent = 'Actualizar';
        document.querySelector('#cancel-edit').style.display = 'block';
    }

    static resetFormState() {
        UI.clearFields();
        document.querySelector('#form-title').textContent = 'Agregar Producto';
        document.querySelector('.btn-form').textContent = 'Guardar Producto';
        document.querySelector('#cancel-edit').style.display = 'none';
    }
}