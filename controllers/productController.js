const Database = require('../database');
const db = Database.getInstance();

const requireAdmin = (req, res) => {
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
        res.status(403).json({ error: 'Acceso denegado. Requiere privilegios administrativos.' });
        return false;
    }
    return true;
};

const getProducts = async (req, res) => {
    try {
        const { category, search, minPrice, maxPrice, talla } = req.query;
        let sql = `SELECT DISTINCT p.id_producto, p.nombre, p.precio, p.imagen_url, p.categoria, p.descripcion FROM productos p`;
        const conditions = [];
        const params = [];
        if (talla) { sql += ' JOIN variantes_producto v ON p.id_producto = v.id_producto'; conditions.push('v.talla = ? AND v.stock > 0'); params.push(talla); }
        if (category) { conditions.push('p.categoria = ?'); params.push(category); }
        if (search) { conditions.push('(p.nombre LIKE ? OR p.descripcion LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
        if (minPrice) { conditions.push('p.precio >= ?'); params.push(minPrice); }
        if (maxPrice) { conditions.push('p.precio <= ?'); params.push(maxPrice); }
        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY p.id_producto DESC';
        res.json(await db.query(sql, params));
    } catch (error) {
        console.error('Error al consultar productos:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor al obtener el catálogo' });
    }
};

const getProductById = async (req, res) => {
    try {
        const products = await db.query('SELECT * FROM productos WHERE id_producto = ?', [req.params.id]);
        if (!products.length) return res.status(404).json({ error: 'Producto no encontrado' });
        const variants = await db.query('SELECT * FROM variantes_producto WHERE id_producto = ? ORDER BY id_variante', [req.params.id]);
        res.json({ producto: products[0], variantes: variants });
    } catch (err) {
        console.error('Error al obtener producto:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const createProduct = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const { nombre, precio, categoria, imagen_url, descripcion } = req.body;
        if (!nombre || precio === undefined || !categoria) return res.status(400).json({ error: 'Nombre, precio y categoría son obligatorios.' });
        const result = await db.query('INSERT INTO productos (nombre, precio, categoria, imagen_url, descripcion) VALUES (?, ?, ?, ?, ?)', [nombre, precio, categoria, imagen_url || 'placeholder.jpg', descripcion || '']);
        for (const talla of ['CH', 'M', 'G', 'XG']) {
            await db.query('INSERT INTO variantes_producto (id_producto, talla, stock) VALUES (?, ?, ?)', [result.insertId, talla, 15]);
        }
        res.status(201).json({ message: 'Producto creado exitosamente', id: result.insertId });
    } catch (err) {
        console.error('Error al crear producto:', err);
        res.status(500).json({ error: 'Error al crear el producto' });
    }
};

const updateProduct = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const { nombre, precio, categoria, imagen_url, descripcion } = req.body;
        await db.query('UPDATE productos SET nombre=?, precio=?, categoria=?, imagen_url=?, descripcion=? WHERE id_producto=?', [nombre, precio, categoria, imagen_url || 'placeholder.jpg', descripcion || '', req.params.id]);
        res.json({ message: 'Producto actualizado correctamente' });
    } catch (err) {
        console.error('Error al actualizar producto:', err);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
};

const deleteProduct = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        await db.query('DELETE FROM variantes_producto WHERE id_producto = ?', [req.params.id]);
        const result = await db.query('DELETE FROM productos WHERE id_producto = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (err) {
        console.error('Error al eliminar producto:', err);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
};

const listVariants = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const variants = await db.query('SELECT * FROM variantes_producto WHERE id_producto = ? ORDER BY id_variante', [req.params.productId]);
        res.json(variants);
    } catch (err) {
        res.status(500).json({ error: 'Error al consultar variantes.' });
    }
};

const createVariant = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const { talla, stock } = req.body;
        const product = await db.query('SELECT id_producto FROM productos WHERE id_producto = ?', [req.params.productId]);
        if (!product.length) return res.status(404).json({ error: 'Producto maestro no encontrado.' });
        if (!talla || stock === undefined || Number(stock) < 0) return res.status(400).json({ error: 'Talla y stock válido son obligatorios.' });
        const result = await db.query('INSERT INTO variantes_producto (id_producto, talla, stock) VALUES (?, ?, ?)', [req.params.productId, String(talla).trim().toUpperCase(), Number(stock)]);
        res.status(201).json({ message: 'Variante creada correctamente.', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una variante con esa talla para este producto.' });
        res.status(500).json({ error: 'Error al crear la variante.' });
    }
};

const updateVariant = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const { talla, stock } = req.body;
        if (!talla || stock === undefined || Number(stock) < 0) return res.status(400).json({ error: 'Talla y stock válido son obligatorios.' });
        const result = await db.query('UPDATE variantes_producto SET talla = ?, stock = ? WHERE id_variante = ? AND id_producto = ?', [String(talla).trim().toUpperCase(), Number(stock), req.params.variantId, req.params.productId]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Variante no encontrada.' });
        res.json({ message: 'Variante actualizada correctamente.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una variante con esa talla para este producto.' });
        res.status(500).json({ error: 'Error al actualizar la variante.' });
    }
};

const deleteVariant = async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const result = await db.query('DELETE FROM variantes_producto WHERE id_variante = ? AND id_producto = ?', [req.params.variantId, req.params.productId]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Variante no encontrada.' });
        res.json({ message: 'Variante eliminada correctamente.' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar la variante.' });
    }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct, listVariants, createVariant, updateVariant, deleteVariant };
