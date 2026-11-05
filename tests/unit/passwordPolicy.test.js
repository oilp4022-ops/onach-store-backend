// Pruebas unitarias - utils/passwordPolicy.js (RNF-02 seguridad, RF-01 registro)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword, hasConsecutiveCharacters } = require('../../utils/passwordPolicy');

describe('UT-01 Política de contraseñas', () => {
    test('acepta una contraseña que cumple las reglas (Tienda#Ur8x)', () => {
        const r = validatePassword('Tienda#Ur8x');
        assert.equal(r.valid, true, r.errors.join(' | '));
    });
    test('rechaza contraseñas con menos de 8 caracteres', () => {
        assert.ok(validatePassword('On#9x').errors.includes('Mínimo 8 caracteres.'));
    });
    test('exige mayúscula, minúscula y carácter especial', () => {
        const r = validatePassword('sinmayusculas');
        assert.equal(r.valid, false);
        assert.ok(r.errors.some((e) => e.includes('mayúscula')));
        assert.ok(r.errors.some((e) => e.includes('especial')));
    });
    test('rechaza secuencias consecutivas (123, abc, cba)', () => {
        assert.equal(hasConsecutiveCharacters('Pass123!'), true);
        assert.equal(hasConsecutiveCharacters('xAbx'), true);
        assert.equal(hasConsecutiveCharacters('Cbaz'), true);
        assert.equal(hasConsecutiveCharacters('Tienda#Ur8x'), false);
    });
    test('DEFECTO DATOS: la contraseña de CP-01 del Parcial 1 (Onach2026!) es rechazada', () => {
        // "On" son letras consecutivas (n-o); cualquier contraseña con la palabra "Onach" se rechaza.
        const r = validatePassword('Onach2026!');
        assert.equal(r.valid, false);
        assert.ok(r.errors[0].includes('consecutivas'));
    });
    test('valores nulos o vacíos se tratan como inválidos sin lanzar excepción', () => {
        assert.equal(validatePassword(null).valid, false);
        assert.equal(validatePassword(undefined).valid, false);
    });
});
