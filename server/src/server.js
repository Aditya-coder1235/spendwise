import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import {
  startRecurringScheduler,
  stopRecurringScheduler,
} from './scheduler/recurring.scheduler.js';

let server;
let shuttingDown = false;

async function start() {
  await connectDatabase();
  console.log('Connected to MongoDB.');

  const app = createApp();
  server = app.listen(env.port, () => {
    console.log(`SpendWise API listening on http://localhost:${env.port}`);
  });
  startRecurringScheduler();
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received. Shutting down gracefully...`);
  stopRecurringScheduler();

  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDatabase();
  clearTimeout(forceExit);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

start().catch((error) => {
  console.error('Failed to start SpendWise:', error.message);
  process.exit(1);
});
