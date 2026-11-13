import AppError from '../shared/errors/AppError.js';

/**
 * Middleware para autorización basada en roles (RBAC)
 * Permite uno o más roles como argumentos individuales o dentro de un array.
 * Ejemplo: authorizeRole('superadmin', 'administrador') o authorizeRole(['superadmin', 'administrador'])
 *
 * @param {...(string|string[])} rolesPermitidos - Roles que tienen permiso para acceder a la ruta
 */
export const authorizeRole = (...rolesPermitidos) => {
  const roles = rolesPermitidos.flat();

  return (req, res, next) => {
    const user = req.user || req.usuario;

    // Verificar que la petición haya pasado por el middleware authenticate / validarJWT
    if (!user || !user.rol) {
      return next(new AppError('No se encontró información de autenticación del usuario', 401));
    }

    // Verificar si el rol del usuario está incluido en los roles permitidos
    if (!roles.includes(user.rol)) {
      return next(
        new AppError(
          `Acceso denegado: el rol '${user.rol}' no tiene permisos suficientes para realizar esta acción`,
          403
        )
      );
    }

    next();
  };
};

export default authorizeRole;
