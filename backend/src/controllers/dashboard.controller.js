import dashboardService from '../services/dashboard.service.js';
import { sendSuccess } from '../shared/http/response.js';

/**
 * Controlador para obtener el resumen e indicadores del dashboard según el rol del usuario autenticado.
 * Delega el cálculo de métricas a `dashboardService.getDashboardSummary`.
 */
export const getSummary = async (req, res, next) => {
  try {
    const user = req.user || req.usuario;
    const summary = await dashboardService.getDashboardSummary(user);
    return sendSuccess(res, summary, 'Resumen de dashboard obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

export default {
  getSummary
};
