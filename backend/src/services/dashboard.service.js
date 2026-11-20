import { getMockUsersStats, isMockDbMode } from '../config/mockStore.js';
import { User } from '../models/User.model.js';

/**
 * Obtiene las métricas e indicadores del dashboard adaptados al rol del usuario autenticado.
 *
 * @param {Object} authenticatedUser - Objeto de usuario autenticado inyectado por validateJwt (req.user o req.usuario)
 * @returns {Promise<Object>} Datos del resumen del dashboard según el rol
 */
export const getDashboardSummary = async (authenticatedUser) => {
  const role = authenticatedUser.rol;
  const timestamp = new Date().toISOString();

  // Si el usuario es administrador o superadmin, tiene acceso a métricas globales de gestión
  if (role === 'superadmin' || role === 'administrador') {
    if (isMockDbMode()) {
      return {
        rol: role,
        usuario: {
          id: authenticatedUser._id,
          nombre: authenticatedUser.nombre,
          correo: authenticatedUser.correo
        },
        indicadores: {
          usuarios: getMockUsersStats()
        },
        timestamp
      };
    }

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalSuperadmins,
      totalAdmins,
      totalOperators
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ estado: true }),
      User.countDocuments({ estado: false }),
      User.countDocuments({ rol: 'superadmin' }),
      User.countDocuments({ rol: 'administrador' }),
      User.countDocuments({ rol: 'operario' })
    ]);

    return {
      rol: role,
      usuario: {
        id: authenticatedUser._id,
        nombre: authenticatedUser.nombre,
        correo: authenticatedUser.correo
      },
      indicadores: {
        usuarios: {
          total: totalUsers,
          activos: activeUsers,
          inactivos: inactiveUsers,
          por_rol: {
            superadmin: totalSuperadmins,
            administrador: totalAdmins,
            operario: totalOperators
          }
        }
      },
      timestamp
    };
  }

  // Si el usuario es operario, recibe un resumen contextual para su rol operativo
  return {
    rol: role,
    usuario: {
      id: authenticatedUser._id,
      nombre: authenticatedUser.nombre,
      correo: authenticatedUser.correo
    },
    indicadores: {
      predios_asignados: 0,
      labores_pendientes: 0,
      incidencias_reportadas: 0
    },
    timestamp
  };
};

export default {
  getDashboardSummary
};
