const jwt = require('jsonwebtoken');
const token = (role = 'cliente', id = 1) => jwt.sign({ id, role, sessionId: 99 }, process.env.JWT_SECRET, { expiresIn: '15m' });
module.exports = { token };
