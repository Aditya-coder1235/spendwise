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
let food;
let transport;
let salary;
let overallBudget;
let foodBudget;
let transportBudget;

before(async () => {
  await resetDatabase();
  alice = await registerAccount({ name: 'Dashboard User' });
  bob = await registerAccount({ name: 'Isolation User' });

  const categories = await getCategories(alice);
  food = categories.find((category) => category.name === 'Food & groceries');
  transport = categories.find((category) => category.name === 'Transport');
  salary = categories.find((category) => category.name === 'Salary');

  const fixtures = [
    { type: 'income', amount: '5000', categoryId: salary.id, description: 'September salary', date: '2026-09-15' },
    { type: 'expense', amount: '1000', categoryId: food.id, description: 'September food', date: '2026-09-15' },
    { type: 'income', amount: '10000', categoryId: salary.id, description: 'October salary', date: '2026-10-05' },
    { type: 'expense', amount: '2000', categoryId: food.id, description: 'October food', date: '2026-10-10' },
    { type: 'expense', amount: '500', categoryId: transport.id, description: 'October transport', date: '2026-10-20' },
  ];
  for (const fixture of fixtures) {
    const response = await createTransaction(alice, fixture);
    assert.equal(response.status, 201, JSON.stringify(response.body));
  }

  overallBudget = await csrf(alice.agent, alice.csrf)
    .post('/api/budgets')
    .send({ categoryId: null, period: '2026-10', monthlyLimit: '4000' });
  assert.equal(overallBudget.status, 201, JSON.stringify(overallBudget.body));

  foodBudget = await csrf(alice.agent, alice.csrf)
    .post('/api/budgets')
    .send({ categoryId: food.id, period: '2026-10', monthlyLimit: '1500' });
  assert.equal(foodBudget.status, 201, JSON.stringify(foodBudget.body));

  transportBudget = await csrf(alice.agent, alice.csrf)
    .post('/api/budgets')
    .send({ categoryId: transport.id, period: '2026-10', monthlyLimit: '600' });
  assert.equal(transportBudget.status, 201, JSON.stringify(transportBudget.body));
});
after(closeDatabase);

test('dashboard totals, comparisons, categories, and recent activity use the selected dates', async () => {
  const response = await alice.agent.get('/api/dashboard/summary').query({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const data = response.body.data;

  assert.equal(data.range.startDate, '2026-10-01');
  assert.equal(data.range.endDate, '2026-10-31');
  assert.equal(data.previousRange.startDate, '2026-09-01');
  assert.equal(data.previousRange.endDate, '2026-09-30');
  assert.equal(data.incomePaise, 1_000_000);
  assert.equal(data.expensePaise, 250_000);
  assert.equal(data.netSavingsPaise, 750_000);
  assert.equal(data.transactionCount, 3);
  assert.equal(data.savingsRate, 75);
  assert.equal(data.totalBalancePaise, 1_150_000);
  assert.equal(data.allTimeIncomePaise, 1_500_000);
  assert.equal(data.allTimeExpensePaise, 350_000);

  assert.equal(data.comparison.previousIncomePaise, 500_000);
  assert.equal(data.comparison.previousExpensePaise, 100_000);
  assert.equal(data.comparison.incomeChangePercent, 100);
  assert.equal(data.comparison.expenseChangePercent, 150);
  assert.equal(data.comparison.savingsChangePercent, 87.5);

  assert.equal(data.categoryBreakdown.totalPaise, 250_000);
  assert.equal(data.categoryBreakdown.items.length, 2);
  assert.equal(data.categoryBreakdown.items[0].name, 'Food & groceries');
  assert.equal(data.categoryBreakdown.items[0].amountPaise, 200_000);
  assert.equal(data.categoryBreakdown.items[0].percentage, 80);

  assert.equal(data.recentTransactions.length, 3);
  assert.deepEqual(
    data.recentTransactions.map((item) => item.description),
    ['October transport', 'October food', 'October salary'],
  );

  assert.equal(data.budget.period, '2026-10');
  assert.equal(data.budget.overall.monthlyLimitPaise, 400_000);
  assert.equal(data.budget.overall.spentPaise, 250_000);
  assert.equal(data.budget.overall.percentage, 62.5);
  assert.equal(data.budget.overall.status, 'ok');
});

test('dashboard validates date ranges and returns honest zeros for new accounts', async () => {
  const partial = await alice.agent.get('/api/dashboard/summary').query({
    startDate: '2026-10-01',
  });
  assert.equal(partial.status, 422);
  assert.equal(partial.body.error.code, 'INVALID_DATE_RANGE');

  const reversed = await alice.agent.get('/api/dashboard/summary').query({
    startDate: '2026-10-31',
    endDate: '2026-10-01',
  });
  assert.equal(reversed.status, 422);

  const empty = await bob.agent.get('/api/dashboard/summary').query({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });
  assert.equal(empty.status, 200);
  assert.equal(empty.body.data.incomePaise, 0);
  assert.equal(empty.body.data.expensePaise, 0);
  assert.equal(empty.body.data.totalBalancePaise, 0);
  assert.equal(empty.body.data.savingsRate, null);
  assert.equal(empty.body.data.categoryBreakdown.items.length, 0);
  assert.equal(empty.body.data.recentTransactions.length, 0);
  assert.equal(empty.body.data.budget.overall, null);
});

test('analytics endpoints produce zero-filled trends and correct daily buckets', async () => {
  const trends = await alice.agent.get('/api/analytics/trends').query({
    startDate: '2026-09-01',
    endDate: '2026-10-31',
  });
  assert.equal(trends.status, 200);
  assert.equal(trends.body.data.trends.length, 2);
  assert.deepEqual(trends.body.data.trends[0], {
    period: '2026-09',
    incomePaise: 500_000,
    expensePaise: 100_000,
    netPaise: 400_000,
  });
  assert.deepEqual(trends.body.data.trends[1], {
    period: '2026-10',
    incomePaise: 1_000_000,
    expensePaise: 250_000,
    netPaise: 750_000,
  });

  const daily = await alice.agent.get('/api/analytics/daily').query({
    month: '2026-10',
    type: 'expense',
  });
  assert.equal(daily.status, 200);
  assert.equal(daily.body.data.days.length, 31);
  assert.equal(
    daily.body.data.days.find((day) => day.date === '2026-10-10').amountPaise,
    200_000,
  );
  assert.equal(
    daily.body.data.days.find((day) => day.date === '2026-10-20').amountPaise,
    50_000,
  );
  assert.equal(
    daily.body.data.days.find((day) => day.date === '2026-10-11').amountPaise,
    0,
  );

  const categories = await alice.agent.get('/api/analytics/categories').query({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    type: 'expense',
  });
  assert.equal(categories.status, 200);
  assert.equal(categories.body.data.totalPaise, 250_000);
  assert.equal(categories.body.data.items[0].name, 'Food & groceries');
});

test('budgets calculate overall, category, warning, and exceeded states', async () => {
  const response = await alice.agent.get('/api/budgets').query({ period: '2026-10' });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const data = response.body.data;

  assert.equal(data.totalSpentPaise, 250_000);
  assert.equal(data.overall.status, 'ok');
  assert.equal(data.overall.remainingPaise, 150_000);

  assert.equal(data.categories.length, 2);
  assert.equal(data.exceededCount, 1);
  assert.equal(data.warningCount, 1);

  const foodStatus = data.categories.find((item) => item.category.name === 'Food & groceries');
  assert.equal(foodStatus.percentage, 133.3);
  assert.equal(foodStatus.status, 'exceeded');
  assert.equal(foodStatus.remainingPaise, -50_000);

  const transportStatus = data.categories.find((item) => item.category.name === 'Transport');
  assert.equal(transportStatus.percentage, 83.3);
  assert.equal(transportStatus.status, 'warning');
  assert.equal(transportStatus.remainingPaise, 10_000);

  const updated = await csrf(alice.agent, alice.csrf)
    .put(`/api/budgets/${overallBudget.body.data.budget.id}`)
    .send({ monthlyLimit: '2000' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.budget.monthlyLimitPaise, 200_000);

  const afterUpdate = await alice.agent.get('/api/budgets').query({ period: '2026-10' });
  assert.equal(afterUpdate.body.data.overall.percentage, 125);
  assert.equal(afterUpdate.body.data.overall.status, 'exceeded');
  assert.equal(afterUpdate.body.data.overall.remainingPaise, -50_000);
});

test('budget duplicates, invalid amounts, mismatched categories, and ownership are rejected', async () => {
  const duplicate = await csrf(alice.agent, alice.csrf)
    .post('/api/budgets')
    .send({ categoryId: food.id, period: '2026-10', monthlyLimit: '100' });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'BUDGET_EXISTS');

  for (const monthlyLimit of ['0', '-5', '1.999']) {
    const invalid = await csrf(alice.agent, alice.csrf)
      .post('/api/budgets')
      .send({ categoryId: null, period: '2026-11', monthlyLimit });
    assert.equal(invalid.status, 422, monthlyLimit);
  }

  const incomeCategory = (await getCategories(alice, 'income'))[0];
  const mismatch = await csrf(alice.agent, alice.csrf)
    .post('/api/budgets')
    .send({ categoryId: incomeCategory.id, period: '2026-11', monthlyLimit: '500' });
  assert.equal(mismatch.status, 422);
  assert.equal(mismatch.body.error.code, 'CATEGORY_TYPE_MISMATCH');

  const foreignDelete = await csrf(bob.agent, bob.csrf).delete(
    `/api/budgets/${foodBudget.body.data.budget.id}`,
  );
  assert.equal(foreignDelete.status, 404);

  const foreignUpdate = await csrf(bob.agent, bob.csrf)
    .put(`/api/budgets/${foodBudget.body.data.budget.id}`)
    .send({ monthlyLimit: '1' });
  assert.equal(foreignUpdate.status, 404);

  const bobBudgets = await bob.agent.get('/api/budgets').query({ period: '2026-10' });
  assert.equal(bobBudgets.body.data.overall, null);
  assert.equal(bobBudgets.body.data.categories.length, 0);

  const deleteTransport = await csrf(alice.agent, alice.csrf).delete(
    `/api/budgets/${transportBudget.body.data.budget.id}`,
  );
  assert.equal(deleteTransport.status, 200);
  const afterDelete = await alice.agent.get('/api/budgets').query({ period: '2026-10' });
  assert.equal(afterDelete.body.data.categories.length, 1);
});
