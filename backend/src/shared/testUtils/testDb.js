import mongoose from 'mongoose';

// URI de la base de datos aislada para la ejecución de pruebas automatizadas
const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/agro_db_test';

/**
 * Conecta Mongoose a la base de datos de pruebas si aún no existe una conexión activa.
 * @returns {Promise<void>}
 */
export const connectTestDb = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
  }
};

/**
 * Elimina todos los documentos de todas las colecciones registradas en la base de datos de pruebas.
 * Se utiliza entre pruebas para garantizar aislamiento de estado.
 * @returns {Promise<void>}
 */
export const clearTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

/**
 * Cierra la conexión de Mongoose con la base de datos de pruebas cuando finaliza la suite.
 * @returns {Promise<void>}
 */
export const disconnectTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

export default {
  connectTestDb,
  clearTestDb,
  disconnectTestDb
};
