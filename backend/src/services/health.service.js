import { db } from '../config/db.js';

/**
 * Obtiene métricas del estado del sistema
 */
export const checkHealth = () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Number(process.uptime().toFixed(2)),
    db: db.getDatabaseStatus()
  };
};

export const healthService = {
  checkHealth
};

export default healthService;
