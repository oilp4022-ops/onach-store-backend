const PASSWORD_RULES = {
    minLength: 8,
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    special: /[^A-Za-z0-9]/
};

function hasConsecutiveCharacters(value) {
    const str = String(value || '');

    // Números consecutivos ascendentes/descendentes: 12, 23, 21, 32...
    for (let i = 0; i < str.length - 1; i++) {
        const a = str.charCodeAt(i);
        const b = str.charCodeAt(i + 1);
        if (a >= 48 && a <= 57 && b >= 48 && b <= 57 && Math.abs(b - a) === 1) {
            return true;
        }
    }

    // Letras consecutivas respecto al abecedario: ab, ba, bc, cb...
    for (let i = 0; i < str.length - 1; i++) {
        const a = str[i].toLowerCase();
        const b = str[i + 1].toLowerCase();
        if (/[a-z]/.test(a) && /[a-z]/.test(b) && Math.abs(b.charCodeAt(0) - a.charCodeAt(0)) === 1) {
            return true;
        }
    }

    return false;
}

function validatePassword(password) {
    const value = String(password || '');
    const errors = [];

    if (value.length < PASSWORD_RULES.minLength) errors.push('Mínimo 8 caracteres.');
    if (!PASSWORD_RULES.uppercase.test(value)) errors.push('Requiere al menos una mayúscula.');
    if (!PASSWORD_RULES.lowercase.test(value)) errors.push('Requiere al menos una minúscula.');
    if (!PASSWORD_RULES.special.test(value)) errors.push('Requiere al menos un carácter especial.');
    if (hasConsecutiveCharacters(value)) errors.push('No se permiten números o letras consecutivas (ej. 123, 321, abc o cba).');

    return { valid: errors.length === 0, errors };
}

module.exports = { validatePassword, hasConsecutiveCharacters };
