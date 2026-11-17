// db.js — Centraliza la conexión a MongoDB para evitar repetir mongoose.connect en cada módulo
import mongoose from "mongoose";
import config from "./env.js";

/**
 * Estados posibles de la conexión de Mongoose mapeados por su código numérico.
 */
export const DB_CONNECTION_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

/**
 * Obtiene el estado actual de la conexión a la base de datos en formato legible.
 * @returns {string} Estado de la conexión ('disconnected', 'connected', 'connecting', 'disconnecting' o 'unknown')
 */
export const getDatabaseStatus = () => {
  const stateCode = mongoose.connection.readyState;
  return DB_CONNECTION_STATES[stateCode] || 'unknown';
};

/**
 * Establece la conexión principal con MongoDB usando la URI configurada en el entorno.
 * En entornos distintos a 'test', finaliza el proceso si la conexión falla.
 * @returns {Promise<import('mongoose').Mongoose|null>} Instancia de Mongoose o null en entorno de pruebas
 */
export const connectDB = async () => {
  try {
    const mongoUri = config.mongoUri || process.env.MONGO_URI || process.env.MONGODB_URI;
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("MongoDB conectado correctamente");
    return conn;
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error.message);
    if (config.nodeEnv !== "test") {
      process.exit(1);
    }
    return null;
  }
};

/**
 * Cierra de forma controlada la conexión activa con MongoDB si se encuentra abierta.
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('[Database] Conexión a MongoDB cerrada');
    }
  } catch (error) {
    console.error(`[Database] Error cerrando conexión a MongoDB: ${error.message}`);
  }
};

/**
 * Agrupación de utilidades y estados de conexión a la base de datos.
 */
export const db = {
  getDatabaseStatus,
  connectDB,
  disconnectDB,
  DB_CONNECTION_STATES
};

// Listeners de ciclo de vida de la conexión para monitoreo en consola
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Desconectado de MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] Reconectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] Evento de error en MongoDB: ${err.message}`);
});

export default connectDB;
