import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  app,
  closeDatabase,
  cookieValue,
  csrf,
  getCategories,
  registerAccount,
  resetDatabase,
} from './support/helpers.js';

before(resetDatabase);
after(closeDatabase);

test('registration creates a user, secure cookies, and default categories', async () => {
  const account = await registerAccount({ name: 'Asha Rao' });

  assert.equal(account.user.name, 'Asha Rao');
  assert.equal(account.user.preferredCurrency, 'INR');
  assert.equal(account.user.warningThreshold, 80);
  assert.equal(account.user.passwordHash, undefined);

  const categories = await getCategories(account);
  assert.equal(categories.length, 18);
  assert.ok(categories.some((category) => category.type === 'expense'));
  assert.ok(categories.some((category) => category.type === 'income'));
  assert.ok(categories.every((category) => category.isDefault === true));

  const response = await account.agent.get('/api/auth/me');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.user.email, account.email);

  const setCookies = account.response.headers['set-cookie'] || [];
  assert.ok(setCookies.some((cookie) => cookie.startsWith('sw_access=') && cookie.includes('HttpOnly')));
  assert.ok(setCookies.some((cookie) => cookie.startsWith('sw_refresh=') && cookie.includes('HttpOnly')));
});

test('registration validates input and rejects duplicate emails', async () => {
  const account = await registerAccount();

  const duplicate = await request(app).post('/api/auth/register').send({
    name: 'Duplicate User',
    email: account.email,
    password: 'TestPass123',
    confirmPassword: 'TestPass123',
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'EMAIL_IN_USE');

  const invalid = await request(app).post('/api/auth/register').send({
    name: 'A',
    email: 'not-an-email',
    password: 'weak',
    confirmPassword: 'different',
  });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.body.error.code, 'VALIDATION_FAILED');
  assert.ok(invalid.body.error.details.some((item) => item.field === 'email'));
  assert.ok(invalid.body.error.details.some((item) => item.field === 'password'));
  assert.ok(invalid.body.error.details.some((item) => item.field === 'confirmPassword'));
});

test('login, CSRF protection, logout, and password change work end to end', async () => {
  const account = await registerAccount();

  const noCsrf = await account.agent
    .put('/api/auth/profile')
    .send({ name: 'Should Fail' });
  assert.equal(noCsrf.status, 403);
  assert.equal(noCsrf.body.error.code, 'CSRF_FAILED');

  const badLogin = await request(app).post('/api/auth/login').send({
    email: account.email,
    password: 'WrongPass123',
  });
  assert.equal(badLogin.status, 401);
  assert.equal(badLogin.body.error.code, 'INVALID_CREDENTIALS');

  await csrf(account.agent, account.csrf).post('/api/auth/logout').send({});
  const afterLogout = await account.agent.get('/api/auth/me');
  assert.equal(afterLogout.status, 401);

  const login = await request(app).post('/api/auth/login').send({
    email: account.email,
    password: account.password,
  });
  assert.equal(login.status, 200);
  const loginCookies = login.headers['set-cookie'] || [];
  const access = loginCookies.find((cookie) => cookie.startsWith('sw_access=')).split(';')[0];
  const csrfCookie = loginCookies.find((cookie) => cookie.startsWith('sw_csrf=')).split(';')[0];
  const csrfToken = decodeURIComponent(csrfCookie.split('=').slice(1).join('='));

  const changed = await request(app)
    .put('/api/auth/password')
    .set('Cookie', `${access}; ${csrfCookie}`)
    .set('X-CSRF-Token', csrfToken)
    .send({ currentPassword: account.password, newPassword: 'NewTestPass456' });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));

  const oldPassword = await request(app).post('/api/auth/login').send({
    email: account.email,
    password: account.password,
  });
  assert.equal(oldPassword.status, 401);

  const newPassword = await request(app).post('/api/auth/login').send({
    email: account.email,
    password: 'NewTestPass456',
  });
  assert.equal(newPassword.status, 200);
});

test('refresh rotates the refresh token and rejects replay of the old token', async () => {
  const account = await registerAccount();
  const login = await request(app).post('/api/auth/login').send({
    email: account.email,
    password: account.password,
  });
  assert.equal(login.status, 200);

  const refreshCookie = cookieValue(login, 'sw_refresh');
  const csrfCookie = cookieValue(login, 'sw_csrf');
  assert.ok(refreshCookie);
  assert.ok(csrfCookie);
  const csrfToken = decodeURIComponent(csrfCookie.split('=').slice(1).join('='));

  const firstRefresh = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', `${refreshCookie}; ${csrfCookie}`)
    .set('X-CSRF-Token', csrfToken);
  assert.equal(firstRefresh.status, 200, JSON.stringify(firstRefresh.body));
  const rotated = cookieValue(firstRefresh, 'sw_refresh');
  assert.ok(rotated);
  assert.notEqual(rotated, refreshCookie);

  const replay = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', `${refreshCookie}; ${csrfCookie}`)
    .set('X-CSRF-Token', csrfToken);
  assert.equal(replay.status, 401);
  assert.equal(replay.body.error.code, 'REFRESH_INVALID');
});

test('profile updates validate fields and sanitize persisted preferences', async () => {
  const account = await registerAccount();

  const invalid = await csrf(account.agent, account.csrf)
    .put('/api/auth/profile')
    .send({ preferredCurrency: 'XYZ', warningThreshold: 10 });
  assert.equal(invalid.status, 422);
  assert.ok(invalid.body.error.details.some((item) => item.field === 'preferredCurrency'));
  assert.ok(invalid.body.error.details.some((item) => item.field === 'warningThreshold'));

  const valid = await csrf(account.agent, account.csrf)
    .put('/api/auth/profile')
    .send({
      name: 'Updated Name',
      preferredCurrency: 'USD',
      dateFormat: 'YYYY-MM-DD',
      theme: 'dark',
      warningThreshold: 90,
    });
  assert.equal(valid.status, 200, JSON.stringify(valid.body));
  assert.equal(valid.body.data.user.name, 'Updated Name');
  assert.equal(valid.body.data.user.preferredCurrency, 'USD');
  assert.equal(valid.body.data.user.theme, 'dark');
  assert.equal(valid.body.data.user.warningThreshold, 90);
});
