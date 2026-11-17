import authService from '../services/auth.service.js';
import { sendSuccess } from '../shared/http/response.js';

/**
 * Controlador para iniciar sesión de un usuario con correo y contraseña.
 * Delega la verificación de credenciales y generación de JWT a `authService.login`.
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
 * Controlador para obtener el perfil del usuario autenticado en el token JWT.
 * Consume `req.user` (o `req.usuario`) inyectado por `validateJwt`.
 */
export const me = async (req, res, next) => {
  try {
    const user = req.user || req.usuario;
    const userId = user._id || user.id;
    const profile = await authService.getProfile(userId);
    return sendSuccess(res, profile, 'Perfil de usuario obtenido exitosamente', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  login,
  me
};
