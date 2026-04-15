const Database = require('../database');
const db = Database.getInstance();

const placeOrder = async (req, res) => {
    try {
        // En un proyecto real aquí insertaríamos los datos en una tabla "pedidos".
        // Por ahora, simulamos la compra exitosa vaciando el carrito del cliente.
        await db.query('DELETE FROM carrito WHERE id_cliente = ?', [req.user.id]);
        res.json({ message: 'Pedido procesado correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al procesar el pedido' });
    }
};

module.exports = { placeOrder };