import dashboardService from '../services/dashboard.service.js';
import { sendSuccess } from '../shared/http/response.js';

/**
 * Controlador para obtener el resumen del dashboard según el rol del usuario autenticado
 */
export const obtenerResumen = async (req, res, next) => {
  try {
    const user = req.user || req.usuario;
    const resumen = await dashboardService.obtenerResumenDashboard(user);
    return sendSuccess(res, resumen, 'Resumen de dashboard obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

export default {
  obtenerResumen
};
