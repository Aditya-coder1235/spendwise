import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryOf,
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
  alice = await registerAccount({ name: 'Alice Kumar' });
  bob = await registerAccount({ name: 'Bob Mehta' });
});
after(closeDatabase);

test('transactions persist paise safely and support get, update, and delete', async () => {
  const created = await createTransaction(alice, {
    amount: '1250.50',
    description: 'Coffee beans',
    merchant: 'Blue Tokai',
    paymentMethod: 'card',
    date: '2026-10-15',
    tags: ['pantry', 'pantry', 'coffee'],
    notes: 'Two bags',
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const transaction = created.body.data.transaction;
  assert.equal(transaction.amountPaise, 125050);
  assert.equal(transaction.amount, 1250.5);
  assert.equal(transaction.category.name.length > 0, true);
  assert.deepEqual(transaction.tags, ['pantry', 'coffee']);

  const fetched = await alice.agent.get(`/api/transactions/${transaction.id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.data.transaction.description, 'Coffee beans');

  const category = fetched.body.data.transaction.category;
  const updated = await csrf(alice.agent, alice.csrf)
    .put(`/api/transactions/${transaction.id}`)
    .send({
      type: 'expense',
      amount: '99.99',
      categoryId: category.id,
      description: 'Coffee beans (updated)',
      merchant: 'Blue Tokai',
      paymentMethod: 'cash',
      date: '2026-10-16',
      tags: ['coffee'],
      notes: '',
    });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.data.transaction.amountPaise, 9999);
  assert.equal(updated.body.data.transaction.paymentMethod, 'cash');

  const removed = await csrf(alice.agent, alice.csrf).delete(
    `/api/transactions/${transaction.id}`,
  );
  assert.equal(removed.status, 200);

  const gone = await alice.agent.get(`/api/transactions/${transaction.id}`);
  assert.equal(gone.status, 404);
  assert.equal(gone.body.error.code, 'TRANSACTION_NOT_FOUND');
});

test('transaction validation rejects unsafe amounts, dates, categories, and CSRF omission', async () => {
  const expenseCategory = await categoryOf(alice, 'expense');
  const base = {
    type: 'expense',
    amount: '100.00',
    categoryId: expenseCategory.id,
    description: 'Validation case',
    merchant: '',
    paymentMethod: 'upi',
    date: '2026-10-10',
    tags: [],
    notes: '',
  };

  const noCsrf = await alice.agent.post('/api/transactions').send(base);
  assert.equal(noCsrf.status, 403);
  assert.equal(noCsrf.body.error.code, 'CSRF_FAILED');

  for (const amount of ['0', '-10', '1.234', 'abc', '9999999999999']) {
    const response = await csrf(alice.agent, alice.csrf)
      .post('/api/transactions')
      .send({ ...base, amount });
    assert.equal(response.status, 422, `amount ${amount}`);
    assert.ok(response.body.error.details.some((item) => item.field === 'amount'));
  }

  const badDate = await csrf(alice.agent, alice.csrf)
    .post('/api/transactions')
    .send({ ...base, date: '2026-02-30' });
  assert.equal(badDate.status, 422);
  assert.ok(badDate.body.error.details.some((item) => item.field === 'date'));

  const mismatch = await csrf(alice.agent, alice.csrf)
    .post('/api/transactions')
    .send({ ...base, type: 'income' });
  assert.equal(mismatch.status, 422);
  assert.equal(mismatch.body.error.code, 'CATEGORY_TYPE_MISMATCH');

  const otherUsersCategory = await categoryOf(bob, 'expense');
  const foreignCategory = await csrf(alice.agent, alice.csrf)
    .post('/api/transactions')
    .send({ ...base, categoryId: otherUsersCategory.id });
  assert.equal(foreignCategory.status, 422);
  assert.equal(foreignCategory.body.error.code, 'INVALID_CATEGORY');

  const unknownField = await csrf(alice.agent, alice.csrf)
    .post('/api/transactions')
    .send({ ...base, userId: bob.user.id });
  assert.equal(unknownField.status, 422);
  assert.equal(unknownField.body.error.code, 'VALIDATION_FAILED');
});

test('search, compound filters, sorting, date ranges, and pagination are applied', async () => {
  const expenseCategory = await categoryOf(alice, 'expense');
  const incomeCategory = await categoryOf(alice, 'income');
  const fixtures = [
    ['Pagination Alpha', '50.00', 'expense', '2026-03-01', 'Corner Shop'],
    ['Pagination Bravo', '150.00', 'expense', '2026-03-02', 'Acme Store'],
    ['Pagination Charlie', '250.00', 'expense', '2026-03-03', 'Acme Store'],
    ['Pagination Delta', '350.00', 'income', '2026-03-04', 'Acme Payroll'],
  ];
  for (const [description, amount, type, date, merchant] of fixtures) {
    const response = await createTransaction(alice, {
      type,
      amount,
      date,
      merchant,
      description,
      categoryId: type === 'expense' ? expenseCategory.id : incomeCategory.id,
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
  }

  const pageOne = await alice.agent.get('/api/transactions').query({
    search: 'Pagination',
    page: 1,
    limit: 2,
    sort: 'date_asc',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
  });
  assert.equal(pageOne.status, 200);
  assert.equal(pageOne.body.data.pagination.total, 4);
  assert.equal(pageOne.body.data.pagination.totalPages, 2);
  assert.deepEqual(
    pageOne.body.data.items.map((item) => item.description),
    ['Pagination Alpha', 'Pagination Bravo'],
  );

  const pageTwo = await alice.agent.get('/api/transactions').query({
    search: 'Pagination',
    page: 2,
    limit: 2,
    sort: 'date_asc',
  });
  assert.deepEqual(
    pageTwo.body.data.items.map((item) => item.description),
    ['Pagination Charlie', 'Pagination Delta'],
  );

  const highest = await alice.agent.get('/api/transactions').query({
    search: 'Pagination',
    sort: 'amount_desc',
  });
  assert.equal(highest.body.data.items[0].amountPaise, 35000);

  const expensesOnly = await alice.agent.get('/api/transactions').query({
    search: 'Pagination',
    type: 'expense',
  });
  assert.equal(expensesOnly.body.data.pagination.total, 3);

  const acmeMerchant = await alice.agent.get('/api/transactions').query({
    search: 'Acme',
  });
  assert.equal(acmeMerchant.body.data.pagination.total, 3);

  const categoryFiltered = await alice.agent.get('/api/transactions').query({
    search: 'Pagination',
    categoryId: incomeCategory.id,
  });
  assert.equal(categoryFiltered.body.data.pagination.total, 1);
  assert.equal(categoryFiltered.body.data.items[0].type, 'income');

  const outsideRange = await alice.agent.get('/api/transactions').query({
    search: 'Pagination',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
  });
  assert.equal(outsideRange.body.data.pagination.total, 0);

  const invalidRange = await alice.agent.get('/api/transactions').query({
    startDate: '2026-04-30',
    endDate: '2026-04-01',
  });
  assert.equal(invalidRange.status, 422);
  assert.equal(invalidRange.body.error.code, 'VALIDATION_FAILED');
});

test('ownership isolation prevents reading, updating, or deleting another user records', async () => {
  const created = await createTransaction(alice, {
    amount: '75.00',
    description: 'Alice private record',
    date: '2026-05-05',
  });
  const id = created.body.data.transaction.id;

  const read = await bob.agent.get(`/api/transactions/${id}`);
  assert.equal(read.status, 404);

  const update = await csrf(bob.agent, bob.csrf)
    .put(`/api/transactions/${id}`)
    .send({
      type: 'expense',
      amount: '10.00',
      categoryId: created.body.data.transaction.category.id,
      description: 'Hijacked',
      merchant: '',
      paymentMethod: 'upi',
      date: '2026-05-05',
      tags: [],
      notes: '',
    });
  assert.equal(update.status, 404);

  const remove = await csrf(bob.agent, bob.csrf).delete(`/api/transactions/${id}`);
  assert.equal(remove.status, 404);

  const bobSearch = await bob.agent.get('/api/transactions').query({
    search: 'Alice private record',
  });
  assert.equal(bobSearch.body.data.pagination.total, 0);

  const invalidId = await alice.agent.get('/api/transactions/not-an-object-id');
  assert.equal(invalidId.status, 422);
});

test('empty lists expose stable pagination data', async () => {
  const account = await registerAccount();
  const response = await account.agent.get('/api/transactions');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.items, []);
  assert.equal(response.body.data.pagination.total, 0);
  assert.equal(response.body.data.pagination.totalPages, 1);

  const categories = await getCategories(account);
  assert.equal(categories.length, 18);
});
