import { Usuario } from '../models/Usuario.model.js';

/**
 * Obtiene las métricas e indicadores del dashboard adaptados al rol del usuario autenticado
 *
 * @param {Object} usuarioAutenticado - Objeto de usuario autenticado (req.user o req.usuario)
 * @returns {Promise<Object>} Datos del resumen del dashboard
 */
export const obtenerResumenDashboard = async (usuarioAutenticado) => {
  const rol = usuarioAutenticado.rol;
  const timestamp = new Date().toISOString();

  // Si el usuario es administrador o superadmin, tiene acceso a métricas globales de gestión
  if (rol === 'superadmin' || rol === 'administrador') {
    const [
      totalUsuarios,
      usuariosActivos,
      usuariosInactivos,
      totalSuperadmins,
      totalAdministradores,
      totalOperarios
    ] = await Promise.all([
      Usuario.countDocuments(),
      Usuario.countDocuments({ estado: true }),
      Usuario.countDocuments({ estado: false }),
      Usuario.countDocuments({ rol: 'superadmin' }),
      Usuario.countDocuments({ rol: 'administrador' }),
      Usuario.countDocuments({ rol: 'operario' })
    ]);

    return {
      rol,
      usuario: {
        id: usuarioAutenticado._id,
        nombre: usuarioAutenticado.nombre,
        correo: usuarioAutenticado.correo
      },
      indicadores: {
        usuarios: {
          total: totalUsuarios,
          activos: usuariosActivos,
          inactivos: usuariosInactivos,
          por_rol: {
            superadmin: totalSuperadmins,
            administrador: totalAdministradores,
            operario: totalOperarios
          }
        }
      },
      timestamp
    };
  }

  // Si el usuario es operario, recibe un resumen contextual para su rol operativo
  return {
    rol,
    usuario: {
      id: usuarioAutenticado._id,
      nombre: usuarioAutenticado.nombre,
      correo: usuarioAutenticado.correo
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
  obtenerResumenDashboard
};
