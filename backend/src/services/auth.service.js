import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import AppError from '../shared/errors/AppError.js';
import { Usuario } from '../models/Usuario.model.js';

/**
 * Autentica un usuario verificando credenciales y estado activo
 * @param {Object} credenciales
 * @param {string} credenciales.correo
 * @param {string} credenciales.contrasena
 * @returns {Promise<{token: string, usuario: object}>}
 */
export const login = async ({ correo, contrasena }) => {
  const correoNormalizado = correo ? correo.toLowerCase().trim() : '';
  const usuario = await Usuario.findOne({ correo: correoNormalizado }).select('+contrasena_hash');

  if (!usuario) {
    throw new AppError('Credenciales inválidas', 401);
  }

  if (!usuario.estado) {
    throw new AppError('Usuario inactivo. Comuníquese con el administrador', 401);
  }

  const esValida = await usuario.compararContrasena(contrasena);
  if (!esValida) {
    throw new AppError('Credenciales inválidas', 401);
  }

  const token = jwt.sign(
    {
      uid: usuario._id,
      id: usuario._id,
      usuario_id: usuario._id,
      rol: usuario.rol,
      correo: usuario.correo
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    usuario: usuario.toJSON()
  };
};

/**
 * Obtiene el perfil de un usuario autenticado
 * @param {string} usuarioId
 * @returns {Promise<object>}
 */
export const getPerfil = async (usuarioId) => {
  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return usuario.toJSON();
};

export default {
  login,
  getPerfil
};
