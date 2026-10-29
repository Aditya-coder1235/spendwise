import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri = env.mongoUri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function assertDatabaseReady() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database is not connected.');
  }
}
