import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

function requiredSecret(name) {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (isTest) return `test-only-${name.toLowerCase()}-secret-value-1234567890`;
  throw new Error(
    `${name} must be set to a random value of at least 32 characters. See server/.env.example.`,
  );
}

function parseOrigins(value) {
  return (value || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spendwise',
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGIN),
  jwtAccessSecret: requiredSecret('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: requiredSecret('JWT_REFRESH_SECRET'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  cookieSecure: process.env.COOKIE_SECURE === 'true' || isProduction,
  trustProxy: process.env.TRUST_PROXY || '1',
  recurringCron: process.env.RECURRING_CRON || '*/15 * * * *',
};

if (!Number.isFinite(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

if (!Number.isFinite(env.refreshTokenDays) || env.refreshTokenDays < 1) {
  throw new Error('REFRESH_TOKEN_TTL_DAYS must be a positive number.');
}

if (env.isProduction && env.cookieSecure !== true) {
  throw new Error('COOKIE_SECURE must be true in production.');
}
