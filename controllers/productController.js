const Database = require('../database');
const db = Database.getInstance();

const getProducts = async (req, res) => {
    try {
        const { category, search, minPrice, maxPrice, talla } = req.query;
        let sql = `SELECT DISTINCT p.id_producto AS id, p.nombre, p.precio, p.imagen_url AS image, p.categoria, p.descripcion 
                   FROM productos p`;
        if (talla) sql += ` JOIN variantes_producto v ON p.id_producto = v.id_producto`;

        let conditions = [];
        let params = [];

        if (talla) { conditions.push('v.talla = ? AND v.stock > 0'); params.push(talla); }
        if (category) { conditions.push('p.categoria = ?'); params.push(category); }
        if (search) {
            conditions.push('(p.nombre LIKE ? OR p.descripcion LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (minPrice) { conditions.push('p.precio >= ?'); params.push(minPrice); }
        if (maxPrice) { conditions.push('p.precio <= ?'); params.push(maxPrice); }

        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY p.id_producto DESC';

        const results = await db.query(sql, params);
        res.json(results);
    } catch (err) { res.status(500).json({ error: 'Error al obtener productos' }); }
};

const getProductById = async (req, res) => {
    try {
        const id = req.params.id;
        const products = await db.query('SELECT * FROM productos WHERE id_producto = ?', [id]);
        if (products.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

        const variants = await db.query('SELECT * FROM variantes_producto WHERE id_producto = ? AND stock > 0', [id]);
        res.json({ producto: products[0], variantes: variants });
    } catch (err) { res.status(500).json({ error: 'Error del servidor' }); }
};

const createProduct = async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    try {
        const { nombre, precio, categoria, imagen_url } = req.body;
        const imagenFinal = imagen_url || 'placeholder.jpg'; 
        const sql = 'INSERT INTO productos (nombre, precio, categoria, descripcion, imagen_url) VALUES (?, ?, ?, ?, ?)';
        const result = await db.query(sql, [nombre, precio, categoria, 'Nueva prenda de temporada.', imagenFinal]);
        
        const tallas = ['CH', 'M', 'G', 'XG'];
        for (let talla of tallas) {
            await db.query('INSERT INTO variantes_producto (id_producto, talla, stock) VALUES (?, ?, ?)', [result.insertId, talla, 15]);
        }
        res.json({ message: 'Producto creado', id: result.insertId });
    } catch (err) { res.status(500).json({ error: 'Error al crear' }); }
};

const updateProduct = async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    try {
        const { nombre, precio, categoria, imagen_url } = req.body;
        await db.query('UPDATE productos SET nombre=?, precio=?, categoria=?, imagen_url=? WHERE id_producto=?', 
                       [nombre, precio, categoria, imagen_url || 'placeholder.jpg', req.params.id]);
        res.json({ message: 'Actualizado' });
    } catch (err) { res.status(500).json({ error: 'Error al actualizar' }); }
};

const deleteProduct = async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    try {
        await db.query('DELETE FROM variantes_producto WHERE id_producto = ?', [req.params.id]);
        await db.query('DELETE FROM productos WHERE id_producto = ?', [req.params.id]);
        res.json({ message: 'Eliminado' });
    } catch (err) { res.status(500).json({ error: 'Error al eliminar' }); }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };