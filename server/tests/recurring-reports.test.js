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

function dateOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function recurringPayload(category, overrides = {}) {
  return {
    type: 'expense',
    amount: '99.00',
    categoryId: category.id,
    description: 'Recurring test entry',
    merchant: 'Subscription Co',
    paymentMethod: 'card',
    tags: ['recurring'],
    notes: '',
    frequency: 'weekly',
    nextOccurrence: dateOffset(0),
    endDate: null,
    active: true,
    ...overrides,
  };
}

let alice;
let bob;
let expense;
let income;

before(async () => {
  await resetDatabase();
  alice = await registerAccount({ name: 'Recurring User' });
  bob = await registerAccount({ name: 'Other Recurring User' });
  expense = await categoryOf(alice, 'expense');
  income = await categoryOf(alice, 'income');
});
after(closeDatabase);

test('due schedules create exactly one real transaction and advance only once', async () => {
  const future = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions')
    .send(recurringPayload(expense, {
      description: 'Future recurring',
      nextOccurrence: dateOffset(20),
    }));
  assert.equal(future.status, 201, JSON.stringify(future.body));

  const inactive = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions')
    .send(recurringPayload(expense, {
      description: 'Paused recurring',
      active: false,
    }));
  assert.equal(inactive.status, 201, JSON.stringify(inactive.body));

  const due = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions')
    .send(recurringPayload(expense, {
      description: 'Weekly gym membership',
      nextOccurrence: dateOffset(0),
    }));
  assert.equal(due.status, 201, JSON.stringify(due.body));
  const dueId = due.body.data.recurring.id;

  const beforeProcess = await alice.agent.get('/api/transactions').query({
    search: 'Weekly gym membership',
  });
  assert.equal(beforeProcess.body.data.pagination.total, 0);

  const processed = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions/process')
    .send({});
  assert.equal(processed.status, 200, JSON.stringify(processed.body));
  assert.equal(processed.body.data.createdCount, 1);

  const transactions = await alice.agent.get('/api/transactions').query({
    search: 'Weekly gym membership',
  });
  assert.equal(transactions.body.data.pagination.total, 1);
  const generated = transactions.body.data.items[0];
  assert.equal(generated.recurrenceId, dueId);
  assert.equal(generated.amountPaise, 9900);
  assert.equal(generated.type, 'expense');
  assert.equal(
    new Date(generated.recurrenceOccurrence).toISOString().slice(0, 10),
    dateOffset(0),
  );

  const secondRun = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions/process')
    .send({});
  assert.equal(secondRun.status, 200);
  assert.equal(secondRun.body.data.createdCount, 0);

  const schedules = await alice.agent.get('/api/recurring-transactions');
  const updatedSchedule = schedules.body.data.items.find((item) => item.id === dueId);
  assert.equal(updatedSchedule.active, true);
  assert.equal(
    new Date(updatedSchedule.nextOccurrence).toISOString().slice(0, 10),
    dateOffset(7),
  );
  assert.ok(updatedSchedule.lastProcessedAt);
});

test('end dates stop future occurrences and inactive templates never generate entries', async () => {
  const ending = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions')
    .send(recurringPayload(income, {
      type: 'income',
      description: 'Ending schedule',
      frequency: 'monthly',
      nextOccurrence: dateOffset(0),
      endDate: dateOffset(0),
    }));
  assert.equal(ending.status, 201, JSON.stringify(ending.body));

  const processed = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions/process')
    .send({});
  assert.equal(processed.body.data.createdCount, 1);

  const schedules = await alice.agent.get('/api/recurring-transactions');
  const updated = schedules.body.data.items.find(
    (item) => item.id === ending.body.data.recurring.id,
  );
  assert.equal(updated.active, false);

  const paused = schedules.body.data.items.find(
    (item) => item.description === 'Paused recurring',
  );
  assert.equal(paused.active, false);

  const pausedTransactions = await alice.agent.get('/api/transactions').query({
    search: 'Paused recurring',
  });
  assert.equal(pausedTransactions.body.data.pagination.total, 0);
});

test('recurring processing is isolated to the authenticated user', async () => {
  const bobCategory = await categoryOf(bob, 'expense');
  const bobSchedule = await csrf(bob.agent, bob.csrf)
    .post('/api/recurring-transactions')
    .send(recurringPayload(bobCategory, {
      description: 'Bob due schedule',
      nextOccurrence: dateOffset(0),
    }));
  assert.equal(bobSchedule.status, 201);

  const aliceRun = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions/process')
    .send({});
  assert.equal(aliceRun.body.data.createdCount, 0);

  const bobBefore = await bob.agent.get('/api/transactions').query({
    search: 'Bob due schedule',
  });
  assert.equal(bobBefore.body.data.pagination.total, 0);

  const bobRun = await csrf(bob.agent, bob.csrf)
    .post('/api/recurring-transactions/process')
    .send({});
  assert.equal(bobRun.body.data.createdCount, 1);

  const bobAfter = await bob.agent.get('/api/transactions').query({
    search: 'Bob due schedule',
  });
  assert.equal(bobAfter.body.data.pagination.total, 1);

  const foreignList = await alice.agent.get('/api/recurring-transactions');
  assert.ok(foreignList.body.data.items.every((item) => item.description !== 'Bob due schedule'));
});

test('recurring validation rejects mismatched categories, bad dates, and foreign records', async () => {
  const wrongType = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions')
    .send(recurringPayload(expense, { type: 'income' }));
  assert.equal(wrongType.status, 422);
  assert.equal(wrongType.body.error.code, 'CATEGORY_TYPE_MISMATCH');

  const badDate = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions')
    .send(recurringPayload(expense, { nextOccurrence: '2026-02-31' }));
  assert.equal(badDate.status, 422);

  const reversedEnd = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions')
    .send(recurringPayload(expense, {
      nextOccurrence: '2026-10-20',
      endDate: '2026-10-01',
    }));
  assert.equal(reversedEnd.status, 422);
  assert.ok(reversedEnd.body.error.details.some((item) => item.field === 'endDate'));

  const created = await csrf(alice.agent, alice.csrf)
    .post('/api/recurring-transactions')
    .send(recurringPayload(expense, { description: 'Owned recurring' }));
  const id = created.body.data.recurring.id;

  const foreignUpdate = await csrf(bob.agent, bob.csrf)
    .put(`/api/recurring-transactions/${id}`)
    .send(recurringPayload(await categoryOf(bob, 'expense'), { active: false }));
  assert.equal(foreignUpdate.status, 404);

  const foreignDelete = await csrf(bob.agent, bob.csrf)
    .delete(`/api/recurring-transactions/${id}`);
  assert.equal(foreignDelete.status, 404);
});

test('yearly schedules advance by one calendar year', async () => {
  const account = await registerAccount({ name: 'Yearly User' });
  const category = await categoryOf(account, 'expense');
  const start = dateOffset(0);
  const created = await csrf(account.agent, account.csrf)
    .post('/api/recurring-transactions')
    .send(
      recurringPayload(category, {
        description: 'Yearly insurance',
        frequency: 'yearly',
        nextOccurrence: start,
      }),
    );
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const processed = await csrf(account.agent, account.csrf)
    .post('/api/recurring-transactions/process')
    .send({});
  assert.equal(processed.body.data.createdCount, 1);

  const schedules = await account.agent.get('/api/recurring-transactions');
  const updated = schedules.body.data.items.find(
    (item) => item.id === created.body.data.recurring.id,
  );
  const expected = new Date(`${start}T00:00:00.000Z`);
  expected.setUTCFullYear(expected.getUTCFullYear() + 1);
  assert.equal(
    new Date(updated.nextOccurrence).toISOString().slice(0, 10),
    expected.toISOString().slice(0, 10),
  );
});

test('reports reconcile totals, category splits, and monthly summaries', async () => {
  const account = await registerAccount({ name: 'Report User' });
  const reportExpense = (await getCategories(account, 'expense'))[0];
  const reportIncome = (await getCategories(account, 'income'))[0];

  const fixtures = [
    {
      type: 'income',
      amount: '1000',
      categoryId: reportIncome.id,
      description: 'October salary',
      date: '2026-10-01',
    },
    {
      type: 'expense',
      amount: '250',
      categoryId: reportExpense.id,
      description: 'Lunch, "special"',
      notes: '=SUM(1,2)',
      date: '2026-10-02',
    },
    {
      type: 'expense',
      amount: '75.50',
      categoryId: reportExpense.id,
      description: 'Bus pass',
      date: '2026-11-03',
    },
  ];
  for (const fixture of fixtures) {
    const response = await createTransaction(account, fixture);
    assert.equal(response.status, 201, JSON.stringify(response.body));
  }

  const summary = await account.agent.get('/api/reports/summary').query({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });
  assert.equal(summary.status, 200, JSON.stringify(summary.body));
  const data = summary.body.data;
  assert.equal(data.totals.incomePaise, 100_000);
  assert.equal(data.totals.expensePaise, 25_000);
  assert.equal(data.netSavingsPaise, 75_000);
  assert.equal(data.savingsRate, 75);
  assert.deepEqual(data.previousRange, {
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  });
  assert.equal(data.comparison.previousExpensePaise, 0);
  assert.equal(data.categoryBreakdown.items.length, 1);
  assert.equal(data.categoryBreakdown.items[0].amountPaise, 25_000);
  assert.equal(data.incomeBreakdown.items[0].amountPaise, 100_000);
  assert.equal(data.monthlySummaries.length, 1);
  assert.equal(data.monthlySummaries[0].transactionCount, 2);

  const invalid = await account.agent.get('/api/reports/summary').query({
    startDate: '2026-10-31',
    endDate: '2026-10-01',
  });
  assert.equal(invalid.status, 422);

  const empty = await (async () => {
    const untouched = await registerAccount({ name: 'Empty Report User' });
    return untouched.agent.get('/api/reports/summary').query({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
  })();
  assert.equal(empty.body.data.totals.transactionCount, 0);
  assert.equal(empty.body.data.savingsRate, null);
});

test('CSV export includes the header, escapes cells, and respects filters and ownership', async () => {
  const account = await registerAccount({ name: 'CSV User' });
  const csvExpense = (await getCategories(account, 'expense'))[0];
  const csvIncome = (await getCategories(account, 'income'))[0];

  const expense = await createTransaction(account, {
    type: 'expense',
    amount: '123.45',
    categoryId: csvExpense.id,
    description: 'Lunch, "special"',
    merchant: 'Cafe, Inc.',
    notes: '=SUM(1,2)',
    tags: ['food', 'work'],
    date: '2026-10-02',
  });
  assert.equal(expense.status, 201);
  const incomeRecord = await createTransaction(account, {
    type: 'income',
    amount: '500',
    categoryId: csvIncome.id,
    description: 'Salary payment',
    date: '2026-10-03',
  });
  assert.equal(incomeRecord.status, 201);

  const exported = await account.agent.get('/api/reports/export').query({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    type: 'expense',
  });
  assert.equal(exported.status, 200);
  assert.match(exported.headers['content-type'], /text\/csv/);
  assert.match(exported.headers['content-disposition'], /attachment; filename="spendwise-transactions-/);
  assert.ok(exported.text.startsWith('\uFEFF'));
  assert.match(exported.text, /"Date","Type","Category","Description"/);
  assert.match(exported.text, /"Lunch, ""special"""/);
  assert.match(exported.text, /"'=SUM\(1,2\)"/);
  assert.match(exported.text, /"123.45"/);
  assert.ok(!exported.text.includes('Salary payment'));

  const searchExport = await account.agent.get('/api/reports/export').query({
    search: 'Lunch',
  });
  assert.equal(searchExport.status, 200);
  assert.ok(searchExport.text.includes('Lunch, ""special""'));
  assert.ok(!searchExport.text.includes('Salary payment'));

  const bobExport = await account.agent.get('/api/reports/export').query({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    categoryId: csvIncome.id,
  });
  assert.ok(!bobExport.text.includes('Lunch, ""special""'));
  assert.ok(bobExport.text.includes('Salary payment'));

  const emptyExport = await bob.agent.get('/api/reports/export').query({
    startDate: '2020-01-01',
    endDate: '2020-01-31',
  });
  assert.equal(emptyExport.status, 200);
  const nonEmptyLines = emptyExport.text
    .replace(/^\uFEFF/, '')
    .trim()
    .split('\r\n');
  assert.equal(nonEmptyLines.length, 1);
});
