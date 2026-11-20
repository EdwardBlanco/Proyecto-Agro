import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import {
  findMockUserByEmail,
  findMockUserById,
  isMockDbMode,
  serializeMockUser
} from '../config/mockStore.js';
import AppError from '../shared/errors/AppError.js';
import { User } from '../models/User.model.js';

/**
 * Autentica un usuario verificando credenciales, estado activo y contraseña.
 * Genera un token JWT con la información de sesión del usuario.
 *
 * @param {Object} credentials - Credenciales de acceso enviadas en la petición
 * @param {string} credentials.correo - Correo electrónico del usuario
 * @param {string} credentials.contrasena - Contraseña en texto plano
 * @returns {Promise<{token: string, usuario: object}>} Token JWT y datos públicos del usuario
 */
export const login = async ({ correo, contrasena }) => {
  const normalizedEmail = correo ? correo.toLowerCase().trim() : '';

  if (isMockDbMode()) {
    const mockUser = findMockUserByEmail(normalizedEmail);
    if (!mockUser) {
      throw new AppError('Credenciales inválidas', 401);
    }

    if (!mockUser.estado) {
      throw new AppError('Usuario inactivo. Comuníquese con el administrador', 401);
    }

    if (mockUser.contrasena_plain !== contrasena) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const token = jwt.sign(
      {
        uid: mockUser._id,
        id: mockUser._id,
        usuario_id: mockUser._id,
        rol: mockUser.rol,
        correo: mockUser.correo
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return {
      token,
      usuario: serializeMockUser(mockUser)
    };
  }

  // Se incluye explícitamente contrasena_hash porque está excluido por defecto en el esquema
  const user = await User.findOne({ correo: normalizedEmail }).select('+contrasena_hash');

  if (!user) {
    throw new AppError('Credenciales inválidas', 401);
  }

  if (!user.estado) {
    throw new AppError('Usuario inactivo. Comuníquese con el administrador', 401);
  }

  const isValid = await user.comparePassword(contrasena);
  if (!isValid) {
    throw new AppError('Credenciales inválidas', 401);
  }

  // El payload conserva uid, id y usuario_id para compatibilidad con el middleware validateJwt
  const token = jwt.sign(
    {
      uid: user._id,
      id: user._id,
      usuario_id: user._id,
      rol: user.rol,
      correo: user.correo
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    usuario: user.toJSON()
  };
};

/**
 * Obtiene el perfil de un usuario autenticado a partir de su identificador.
 *
 * @param {string} userId - Identificador único del usuario en MongoDB
 * @returns {Promise<object>} Objeto JSON con los datos del perfil del usuario
 */
export const getProfile = async (userId) => {
  if (isMockDbMode()) {
    const mockUser = findMockUserById(userId);
    if (!mockUser) {
      throw new AppError('Usuario no encontrado', 404);
    }
    return serializeMockUser(mockUser);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return user.toJSON();
};

export default {
  login,
  getProfile
};
