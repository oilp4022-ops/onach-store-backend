// js/app.js 
import { DataStore } from './data.js';
import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    const products = await DataStore.getProducts();
    UI.displayProducts(products);
    setupDragAndDrop(); 
});

const form = document.getElementById('product-form');
if(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.querySelector('#nombre').value;
        const precio = document.querySelector('#precio').value;
        const categoria = document.querySelector('#categoria').value;
        // NUEVO: Capturar la imagen
        const imagen_url = document.querySelector('#imagen').value; 
        const id = document.querySelector('#product-id').value;

        if(nombre === '' || precio === '') {
            UI.showAlert('Llena todos los campos obligatorios', 'error');
            return;
        }

        // NUEVO: Agregar imagen_url al objeto
        const productObj = { nombre, precio, categoria, imagen_url };

        try {
            if(id === '') {
                await DataStore.addProduct(productObj);
                UI.showAlert('Producto agregado a BD', 'success');
            } else {
                productObj.id = id;
                await DataStore.updateProduct(productObj);
                UI.showAlert('Producto actualizado', 'success');
                UI.resetFormState();
            }
            
            const products = await DataStore.getProducts();
            UI.displayProducts(products);
            setupDragAndDrop();
            if(id === '') UI.clearFields();

        } catch (error) {
            UI.showAlert('Error en el servidor', 'error');
            console.error(error);
        }
    });
}

const productList = document.querySelector('#product-list');
if(productList) {
    productList.addEventListener('click', async (e) => {
        if(e.target.classList.contains('btn-delete')) {
            if(confirm('¿Eliminar permanentemente de la BD?')) {
                const id = e.target.getAttribute('data-id');
                try {
                    await DataStore.removeProduct(id);
                    UI.deleteProductFromUI(e.target); 
                    UI.showAlert('Eliminado correctamente', 'success');
                } catch(err) {
                    UI.showAlert('Error al eliminar', 'error');
                }
            }
        }
        
        if(e.target.classList.contains('btn-edit')) {
            const id = e.target.getAttribute('data-id');
            const products = await DataStore.getProducts();
            const productToEdit = products.find(p => p.id == id);
            if(productToEdit) UI.fillForm(productToEdit);
        }
    });
}

document.querySelector('#cancel-edit')?.addEventListener('click', () => {
    UI.resetFormState();
});

document.querySelector('#search-filter')?.addEventListener('keyup', async (e) => {
    const text = e.target.value.toLowerCase();
    const allProducts = await DataStore.getProducts();
    const filtered = allProducts.filter(p => p.nombre.toLowerCase().includes(text));
    UI.displayProducts(filtered);
    setupDragAndDrop();
});

document.getElementById('btn-convert-currency')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-convert-currency');
    
    if (UI.currentCurrency === 'MXN') {
        btn.textContent = 'Cargando...';
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/MXN');
            const data = await res.json();
            
            UI.exchangeRate = data.rates.USD; 
            UI.currentCurrency = 'USD';
            
            btn.innerHTML = '<i class="fas fa-undo"></i> Volver a MXN';
            btn.style.background = '#007bff';
            UI.showAlert(`Precios convertidos a USD (Tasa: ${UI.exchangeRate})`, 'success');
        } catch (error) {
            UI.showAlert('Error al conectar con API de divisas', 'error');
        }
    } else {
        UI.currentCurrency = 'MXN';
        UI.exchangeRate = 1;
        btn.innerHTML = '<i class="fas fa-dollar-sign"></i> Convertir a USD (API)';
        btn.style.background = '#28a745';
    }

    const products = await DataStore.getProducts();
    UI.displayProducts(products);
    setupDragAndDrop();
});

function setupDragAndDrop() {
    const rows = document.querySelectorAll('#product-list tr');
    let draggedRow = null;

    rows.forEach(row => {
        row.addEventListener('dragstart', function() {
            draggedRow = this;
            this.classList.add('dragging');
            setTimeout(() => this.style.opacity = '0.5', 0);
        });
        row.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            this.style.opacity = '1';
            draggedRow = null;
        });
        row.addEventListener('dragover', e => e.preventDefault());
        row.addEventListener('dragenter', function(e) {
            e.preventDefault();
            this.style.borderBottom = '2px solid var(--color-carmesi)';
        });
        row.addEventListener('dragleave', function() {
            this.style.borderBottom = '1px solid #eee';
        });
        row.addEventListener('drop', function() {
            this.style.borderBottom = '1px solid #eee';
            if (this !== draggedRow) {
                let allRows = Array.from(document.querySelectorAll('#product-list tr'));
                if (allRows.indexOf(draggedRow) < allRows.indexOf(this)) {
                    this.after(draggedRow);
                } else {
                    this.before(draggedRow);
                }
            }
        });
    });
}