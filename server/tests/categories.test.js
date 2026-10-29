import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  closeDatabase,
  createTransaction,
  csrf,
  getCategories,
  registerAccount,
  resetDatabase,
} from './support/helpers.js';

let alice;
let bob;

before(async () => {
  await resetDatabase();
  alice = await registerAccount({ name: 'Category Owner' });
  bob = await registerAccount({ name: 'Category Other' });
});
after(closeDatabase);

test('custom categories can be created, listed, renamed, and deleted', async () => {
  const created = await csrf(alice.agent, alice.csrf)
    .post('/api/categories')
    .send({ name: 'Pet care', type: 'expense', color: '#2f855a', icon: 'paw-print' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const category = created.body.data.category;
  assert.equal(category.name, 'Pet care');
  assert.equal(category.isDefault, false);
  assert.equal(category.userId, alice.user.id);
  assert.equal(category.nameKey, undefined);

  const listed = await getCategories(alice, 'expense');
  assert.ok(listed.some((item) => item.id === category.id));

  const updated = await csrf(alice.agent, alice.csrf)
    .put(`/api/categories/${category.id}`)
    .send({ name: 'Pets & vet', color: '#805ad5', icon: 'heart' });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.data.category.name, 'Pets & vet');
  assert.equal(updated.body.data.category.color, '#805ad5');

  const removed = await csrf(alice.agent, alice.csrf).delete(
    `/api/categories/${category.id}`,
  );
  assert.equal(removed.status, 200);
  const remaining = await getCategories(alice);
  assert.ok(!remaining.some((item) => item.id === category.id));
});

test('category names are unique per type and custom categories cannot be deleted while used', async () => {
  const created = await csrf(alice.agent, alice.csrf)
    .post('/api/categories')
    .send({ name: 'Hobbies', type: 'expense', color: '#dd6b20', icon: 'palette' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const category = created.body.data.category;

  const duplicate = await csrf(alice.agent, alice.csrf)
    .post('/api/categories')
    .send({ name: 'hobbies', type: 'expense', color: '#dd6b20', icon: 'palette' });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'DUPLICATE');

  const renamesToDuplicate = await csrf(alice.agent, alice.csrf)
    .put(`/api/categories/${category.id}`)
    .send({ name: 'Food & groceries', color: '#dd6b20', icon: 'palette' });
  assert.equal(renamesToDuplicate.status, 409);

  const otherType = await csrf(alice.agent, alice.csrf)
    .post('/api/categories')
    .send({ name: 'Hobbies', type: 'income', color: '#dd6b20', icon: 'palette' });
  assert.equal(otherType.status, 201);

  const transaction = await createTransaction(alice, {
    categoryId: category.id,
    description: 'Pottery class',
    amount: '45.00',
    date: '2026-08-12',
  });
  assert.equal(transaction.status, 201);

  const inUse = await csrf(alice.agent, alice.csrf).delete(
    `/api/categories/${category.id}`,
  );
  assert.equal(inUse.status, 409);
  assert.equal(inUse.body.error.code, 'CATEGORY_IN_USE');

  await csrf(alice.agent, alice.csrf).delete(
    `/api/transactions/${transaction.body.data.transaction.id}`,
  );
  const nowFree = await csrf(alice.agent, alice.csrf).delete(
    `/api/categories/${category.id}`,
  );
  assert.equal(nowFree.status, 200);
});

test('default categories are protected and malformed category payloads are rejected', async () => {
  const defaults = await getCategories(alice);
  const defaultCategory = defaults.find((category) => category.isDefault);

  const renameDefault = await csrf(alice.agent, alice.csrf)
    .put(`/api/categories/${defaultCategory.id}`)
    .send({ name: 'Renamed default', color: '#111827', icon: 'tag' });
  assert.equal(renameDefault.status, 409);
  assert.equal(renameDefault.body.error.code, 'DEFAULT_CATEGORY');

  const deleteDefault = await csrf(alice.agent, alice.csrf).delete(
    `/api/categories/${defaultCategory.id}`,
  );
  assert.equal(deleteDefault.status, 409);
  assert.equal(deleteDefault.body.error.code, 'DEFAULT_CATEGORY');

  const invalidColor = await csrf(alice.agent, alice.csrf)
    .post('/api/categories')
    .send({ name: 'Bad colour', type: 'expense', color: 'red', icon: 'tag' });
  assert.equal(invalidColor.status, 422);

  const unknownField = await csrf(alice.agent, alice.csrf)
    .post('/api/categories')
    .send({ name: 'Unknown field', type: 'expense', color: '#112233', icon: 'tag', isDefault: true });
  assert.equal(unknownField.status, 422);
});

test('categories are isolated between accounts', async () => {
  const created = await csrf(alice.agent, alice.csrf)
    .post('/api/categories')
    .send({ name: 'Private category', type: 'expense', color: '#112233', icon: 'lock' });
  const id = created.body.data.category.id;

  const update = await csrf(bob.agent, bob.csrf)
    .put(`/api/categories/${id}`)
    .send({ name: 'Stolen category', color: '#112233', icon: 'lock' });
  assert.equal(update.status, 404);

  const remove = await csrf(bob.agent, bob.csrf).delete(`/api/categories/${id}`);
  assert.equal(remove.status, 404);

  const bobCategories = await getCategories(bob);
  assert.ok(!bobCategories.some((category) => category.id === id));
});
