import mongoose from 'mongoose';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/agro_db_test';

export const connectTestDb = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
  }
};

export const clearTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

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
