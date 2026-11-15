// db.js — centraliza la conexión para no repetir mongoose.connect en cada archivo
import mongoose from "mongoose";
import config from "./env.js";

export const DB_CONNECTION_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

export const getDatabaseStatus = () => {
  const stateCode = mongoose.connection.readyState;
  return DB_CONNECTION_STATES[stateCode] || 'unknown';
};

export const conectarDB = async () => {
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

export const connectDB = conectarDB;

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

export const db = {
  getDatabaseStatus,
  conectarDB,
  connectDB,
  disconnectDB,
  DB_CONNECTION_STATES
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Desconectado de MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] Reconectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] Evento de error en MongoDB: ${err.message}`);
});

export default conectarDB;
