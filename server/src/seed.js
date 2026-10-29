import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Session } from './models/Session.js';
import { Category } from './models/Category.js';
import { Transaction } from './models/Transaction.js';
import { Budget } from './models/Budget.js';
import { RecurringTransaction } from './models/RecurringTransaction.js';
import { ensureDefaultCategories } from './services/category.service.js';
import { toPaise } from './utils/money.js';

const DEMO_EMAIL = 'demo@spendwise.local';
const DEMO_PASSWORD = 'DemoPass123!';

function utcDate(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function safeDate(monthStart, day, now) {
  const candidate = utcDate(monthStart.getFullYear(), monthStart.getMonth(), day);
  const today = utcDate(now.getFullYear(), now.getMonth(), now.getDate());
  return candidate <= today ? candidate : today;
}

function transaction({
  type,
  amount,
  category,
  description,
  merchant,
  paymentMethod,
  date,
  tags = [],
  notes = '',
}) {
  return {
    type,
    amountPaise: toPaise(amount),
    category: category._id,
    description,
    merchant,
    paymentMethod,
    date,
    tags,
    notes,
  };
}

async function seed() {
  await connectDatabase();
  console.log(`Seeding ${env.mongoUri}`);

  let user = await User.findOne({ email: DEMO_EMAIL }).select('+passwordHash');
  const passwordHash = await User.hashPassword(DEMO_PASSWORD);
  if (user) {
    user.name = 'Demo User';
    user.passwordHash = passwordHash;
    user.preferredCurrency = 'INR';
    user.theme = 'light';
    user.dateFormat = 'DD/MM/YYYY';
    user.warningThreshold = 80;
    await user.save();
  } else {
    user = await User.create({
      name: 'Demo User',
      email: DEMO_EMAIL,
      passwordHash,
      preferredCurrency: 'INR',
      dateFormat: 'DD/MM/YYYY',
    });
  }

  await Promise.all([
    Transaction.deleteMany({ userId: user._id }),
    Budget.deleteMany({ userId: user._id }),
    RecurringTransaction.deleteMany({ userId: user._id }),
    Session.deleteMany({ userId: user._id }),
    Category.deleteMany({ userId: user._id }),
  ]);

  await ensureDefaultCategories(user._id);
  const categories = await Category.find({ userId: user._id });
  const byName = new Map(categories.map((category) => [category.name, category]));
  const category = (name) => {
    const found = byName.get(name);
    if (!found) throw new Error(`Seed category missing: ${name}`);
    return found;
  };

  const now = new Date();
  const currentMonth = startOfMonth(now);
  const transactions = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthStart = startOfMonth(subMonths(currentMonth, offset));
    const monthIndex = monthStart.getMonth();
    const year = monthStart.getFullYear();
    const day = (value) => safeDate(monthStart, value, now);

    transactions.push(
      transaction({
        type: 'income',
        amount: offset === 0 ? '95000' : '88000',
        category: category('Salary'),
        description: 'Monthly salary credit',
        merchant: 'Northstar Technologies',
        paymentMethod: 'bank_transfer',
        date: utcDate(year, monthIndex, 1),
        tags: ['salary'],
      }),
    );

    if (offset % 2 === 0) {
      transactions.push(
        transaction({
          type: 'income',
          amount: '18500',
          category: category('Freelance'),
          description: 'Freelance design project',
          merchant: 'Studio Meraki',
          paymentMethod: 'bank_transfer',
          date: day(12),
          tags: ['freelance'],
        }),
      );
    }

    transactions.push(
      transaction({
        type: 'expense',
        amount: '25000',
        category: category('Rent & housing'),
        description: 'Apartment rent',
        merchant: 'Green Park Residency',
        paymentMethod: 'bank_transfer',
        date: utcDate(year, monthIndex, 3),
        tags: ['housing'],
      }),
      transaction({
        type: 'expense',
        amount: offset === 0 ? '4850' : '5200',
        category: category('Food & groceries'),
        description: 'Monthly grocery run',
        merchant: 'More Supermarket',
        paymentMethod: 'card',
        date: day(5),
        tags: ['essentials'],
      }),
      transaction({
        type: 'expense',
        amount: '1240',
        category: category('Food & groceries'),
        description: 'Fresh produce and fruit',
        merchant: 'Local farmers market',
        paymentMethod: 'upi',
        date: day(11),
        tags: ['essentials'],
      }),
      transaction({
        type: 'expense',
        amount: '1680',
        category: category('Bills & utilities'),
        description: 'Electricity bill',
        merchant: 'State Power Board',
        paymentMethod: 'net_banking',
        date: day(8),
        tags: ['utilities'],
      }),
      transaction({
        type: 'expense',
        amount: '999',
        category: category('Bills & utilities'),
        description: 'Home internet',
        merchant: 'Fiberline',
        paymentMethod: 'card',
        date: day(9),
        tags: ['utilities'],
      }),
      transaction({
        type: 'expense',
        amount: '1350',
        category: category('Transport'),
        description: 'Metro card top-up',
        merchant: 'City Metro',
        paymentMethod: 'upi',
        date: day(7),
        tags: ['commute'],
      }),
      transaction({
        type: 'expense',
        amount: '1890',
        category: category('Food & groceries'),
        description: 'Dinner with friends',
        merchant: 'Tandoor House',
        paymentMethod: 'card',
        date: day(17),
        tags: ['dining'],
      }),
      transaction({
        type: 'expense',
        amount: '549',
        category: category('Subscriptions'),
        description: 'Music streaming plan',
        merchant: 'Soundwave',
        paymentMethod: 'card',
        date: day(14),
        tags: ['subscription'],
      }),
    );

    if (offset % 2 === 0) {
      transactions.push(
        transaction({
          type: 'expense',
          amount: '2450',
          category: category('Shopping'),
          description: 'Home and kitchen supplies',
          merchant: 'Urban Living',
          paymentMethod: 'card',
          date: day(21),
          tags: ['home'],
        }),
      );
    }

    if (offset === 1) {
      transactions.push(
        transaction({
          type: 'expense',
          amount: '1200',
          category: category('Health'),
          description: 'Pharmacy and vitamins',
          merchant: 'Wellness Pharmacy',
          paymentMethod: 'upi',
          date: day(22),
          tags: ['health'],
        }),
      );
    }

    if (offset === 0) {
      transactions.push(
        transaction({
          type: 'expense',
          amount: '1799',
          category: category('Entertainment'),
          description: 'Cinema and snacks',
          merchant: 'PVR Cinemas',
          paymentMethod: 'card',
          date: day(19),
          tags: ['weekend'],
        }),
        transaction({
          type: 'expense',
          amount: '3200',
          category: category('Shopping'),
          description: 'Running shoes',
          merchant: 'Stride Store',
          paymentMethod: 'card',
          date: day(23),
          tags: ['fitness'],
          notes: 'Replacement for the old pair.',
        }),
      );
    }
  }

  const created = await Transaction.insertMany(
    transactions.map((item) => ({ ...item, userId: user._id })),
  );

  const period = format(currentMonth, 'yyyy-MM');
  await Budget.insertMany([
    { userId: user._id, category: null, period, monthlyLimitPaise: toPaise('60000') },
    {
      userId: user._id,
      category: category('Rent & housing')._id,
      period,
      monthlyLimitPaise: toPaise('25000'),
    },
    {
      userId: user._id,
      category: category('Food & groceries')._id,
      period,
      monthlyLimitPaise: toPaise('9000'),
    },
    {
      userId: user._id,
      category: category('Bills & utilities')._id,
      period,
      monthlyLimitPaise: toPaise('3000'),
    },
    {
      userId: user._id,
      category: category('Transport')._id,
      period,
      monthlyLimitPaise: toPaise('4000'),
    },
    {
      userId: user._id,
      category: category('Shopping')._id,
      period,
      monthlyLimitPaise: toPaise('5000'),
    },
  ]);

  const nextMonth = startOfMonth(addMonths(now, 1));
  await RecurringTransaction.insertMany([
    {
      userId: user._id,
      type: 'income',
      amountPaise: toPaise('95000'),
      category: category('Salary')._id,
      description: 'Monthly salary credit',
      merchant: 'Northstar Technologies',
      paymentMethod: 'bank_transfer',
      tags: ['salary'],
      frequency: 'monthly',
      nextOccurrence: nextMonth,
      active: true,
    },
    {
      userId: user._id,
      type: 'expense',
      amountPaise: toPaise('25000'),
      category: category('Rent & housing')._id,
      description: 'Apartment rent',
      merchant: 'Green Park Residency',
      paymentMethod: 'bank_transfer',
      tags: ['housing'],
      frequency: 'monthly',
      nextOccurrence: nextMonth,
      active: true,
    },
    {
      userId: user._id,
      type: 'expense',
      amountPaise: toPaise('549'),
      category: category('Subscriptions')._id,
      description: 'Music streaming plan',
      merchant: 'Soundwave',
      paymentMethod: 'card',
      tags: ['subscription'],
      frequency: 'monthly',
      nextOccurrence: nextMonth,
      active: true,
    },
    {
      userId: user._id,
      type: 'expense',
      amountPaise: toPaise('1200'),
      category: category('Health')._id,
      description: 'Gym membership',
      merchant: 'FitZone',
      paymentMethod: 'card',
      tags: ['fitness'],
      frequency: 'monthly',
      nextOccurrence: nextMonth,
      active: false,
    },
  ]);

  const income = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amountPaise, 0);
  const expense = transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amountPaise, 0);

  console.log(
    `Seeded ${created.length} transactions, 6 budgets, and 4 recurring schedules for ${DEMO_EMAIL}.`,
  );
  console.log(
    `All-time income ₹${(income / 100).toFixed(2)}, expenses ₹${(expense / 100).toFixed(2)}.`,
  );
  console.log(`Demo password: ${DEMO_PASSWORD}`);
}

seed()
  .then(async () => {
    await disconnectDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  });
