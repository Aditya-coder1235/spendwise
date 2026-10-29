import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';

const expressApp = createApp();
export const app = await new Promise((resolve, reject) => {
  const server = expressApp.listen(0, '127.0.0.1', () => resolve(server));
  server.once('error', reject);
});

export async function resetDatabase() {
  await connectDatabase();
  await mongoose.connection.db.dropDatabase();
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
}

export async function closeDatabase() {
  await mongoose.connection.db.dropDatabase();
  await new Promise((resolve, reject) => {
    app.close((error) => (error ? reject(error) : resolve()));
  });
  await disconnectDatabase();
}

function csrfFromResponse(response) {
  const cookies = response.headers['set-cookie'] || [];
  const csrfCookie = cookies.find((cookie) => cookie.startsWith('sw_csrf='));
  assert.ok(csrfCookie, 'Expected a CSRF cookie');
  return decodeURIComponent(csrfCookie.split(';')[0].split('=').slice(1).join('='));
}

export function csrf(agent, token) {
  return {
    get: (url) => agent.get(url).set('X-CSRF-Token', token),
    post: (url) => agent.post(url).set('X-CSRF-Token', token),
    put: (url) => agent.put(url).set('X-CSRF-Token', token),
    delete: (url) => agent.delete(url).set('X-CSRF-Token', token),
  };
}

let accountNumber = 0;

export async function registerAccount(overrides = {}) {
  accountNumber += 1;
  const agent = request.agent(app);
  const password = overrides.password || 'TestPass123';
  const email =
    overrides.email || `account-${Date.now()}-${accountNumber}@spendwise.test`;
  const response = await agent.post('/api/auth/register').send({
    name: overrides.name || `Test User ${accountNumber}`,
    email,
    password,
    confirmPassword: password,
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return {
    agent,
    csrf: csrfFromResponse(response),
    user: response.body.data.user,
    email,
    password,
    response,
  };
}

export async function getCategories(account, type) {
  const response = await account.agent
    .get('/api/categories')
    .query(type ? { type } : {});
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body.data.categories;
}

export async function categoryOf(account, type = 'expense') {
  const categories = await getCategories(account, type);
  assert.ok(categories.length > 0);
  return categories[0];
}

export async function createTransaction(account, overrides = {}) {
  const { category: categoryOverride, ...payload } = overrides;
  const category =
    categoryOverride || (await categoryOf(account, payload.type || 'expense'));
  const response = await csrf(account.agent, account.csrf)
    .post('/api/transactions')
    .send({
      type: 'expense',
      amount: '100.00',
      description: 'Test transaction',
      merchant: '',
      paymentMethod: 'upi',
      date: '2026-10-15',
      tags: [],
      notes: '',
      ...payload,
      categoryId: payload.categoryId || category.id,
    });
  return response;
}

export function cookieValue(response, name) {
  const cookies = response.headers['set-cookie'] || [];
  const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return found ? found.split(';')[0] : null;
}
