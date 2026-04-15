const Database = require('../database');
const db = Database.getInstance();

const getCart = async (req, res) => {
    try {
        const sql = `SELECT c.id_variante as id, p.nombre, p.precio, p.imagen_url AS image, c.cantidad, v.talla
                     FROM carrito c JOIN variantes_producto v ON c.id_variante = v.id_variante
                     JOIN productos p ON v.id_producto = p.id_producto WHERE c.id_cliente = ?`;
        const results = await db.query(sql, [req.user.id]);
        res.json(results);
    } catch (err) { res.status(500).json({ error: 'Error cargando carrito' }); }
};

const addToCart = async (req, res) => {
    try {
        const { variantId, quantity } = req.body;
        const sql = `INSERT INTO carrito (id_cliente, id_variante, cantidad) VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE cantidad = cantidad + ?`;
        await db.query(sql, [req.user.id, variantId, quantity, quantity]);
        res.json({ message: 'Agregado exitosamente' });
    } catch (err) { res.status(500).json({ error: 'Error al agregar al carrito' }); }
};

const removeFromCart = async (req, res) => {
    try {
        await db.query('DELETE FROM carrito WHERE id_cliente = ? AND id_variante = ?', [req.user.id, req.params.id]);
        res.json({ message: 'Eliminado' });
    } catch (err) { res.status(500).json({ error: 'Error al eliminar' }); }
};

module.exports = { getCart, addToCart, removeFromCart };