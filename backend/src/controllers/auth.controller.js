import authService from '../services/auth.service.js';
import { sendSuccess } from '../shared/http/response.js';

/**
 * Iniciar sesión
 */
export const login = async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body;
    const result = await authService.login({ correo, contrasena });
    return sendSuccess(res, result, 'Inicio de sesión exitoso', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener perfil del usuario autenticado
 */
export const me = async (req, res, next) => {
  try {
    const user = req.user || req.usuario;
    const usuarioId = user._id || user.id;
    const perfil = await authService.getPerfil(usuarioId);
    return sendSuccess(res, perfil, 'Perfil de usuario obtenido exitosamente', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  login,
  me
};
