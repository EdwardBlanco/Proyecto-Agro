import healthService from '../services/health.service.js';

/**
 * Controlador para verificar el estado de salud del backend
 * GET /api/v1/health
 */
export const getHealth = (req, res) => {
  const healthData = healthService.checkHealth();
  return res.status(200).json(healthData);
};

export default {
  getHealth
};
