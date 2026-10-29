process.env.NODE_ENV = 'test';
process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/spendwise_test';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';
process.env.RECURRING_CRON = '*/15 * * * *';
