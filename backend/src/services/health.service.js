import { db } from '../config/db.js';

/**
 * Obtiene métricas básicas del estado de salud del sistema y de la conexión a MongoDB.
 * Se conecta con la utilidad `db.getDatabaseStatus` definida en `config/db.js`.
 *
 * @returns {{status: string, timestamp: string, uptime: number, db: string}} Métricas de salud del backend
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
