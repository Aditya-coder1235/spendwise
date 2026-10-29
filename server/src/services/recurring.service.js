import { RecurringTransaction } from '../models/RecurringTransaction.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/api-error.js';
import { frequencyNextDate } from '../utils/dates.js';
import { getOwnedCategory } from './category.service.js';

const CATEGORY_FIELDS = 'name type color icon';

export async function listRecurring(userId) {
  return RecurringTransaction.find({ userId })
    .sort({ active: -1, nextOccurrence: 1 })
    .populate('category', CATEGORY_FIELDS);
}

export async function createRecurring(userId, input) {
  await getOwnedCategory(userId, input.categoryId, input.type);
  return RecurringTransaction.create({
    userId,
    type: input.type,
    amountPaise: input.amount,
    category: input.categoryId,
    description: input.description,
    merchant: input.merchant,
    paymentMethod: input.paymentMethod,
    tags: input.tags,
    notes: input.notes,
    frequency: input.frequency,
    nextOccurrence: input.nextOccurrence,
    endDate: input.endDate ? input.endDate : null,
    active: input.active,
  }).then((doc) => doc.populate('category', CATEGORY_FIELDS));
}

export async function updateRecurring(userId, recurringId, input) {
  const recurring = await RecurringTransaction.findOne({ _id: recurringId, userId });
  if (!recurring) throw new ApiError(404, 'Recurring transaction not found.', 'RECURRING_NOT_FOUND');
  await getOwnedCategory(userId, input.categoryId, input.type);

  recurring.set({
    type: input.type,
    amountPaise: input.amount,
    category: input.categoryId,
    description: input.description,
    merchant: input.merchant,
    paymentMethod: input.paymentMethod,
    tags: input.tags,
    notes: input.notes,
    frequency: input.frequency,
    nextOccurrence: input.nextOccurrence,
    endDate: input.endDate ? input.endDate : null,
    active: input.active,
  });
  await recurring.save();
  return recurring.populate('category', CATEGORY_FIELDS);
}

export async function deleteRecurring(userId, recurringId) {
  const result = await RecurringTransaction.deleteOne({ _id: recurringId, userId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, 'Recurring transaction not found.', 'RECURRING_NOT_FOUND');
  }
}

/**
 * Creates one real transaction per missed occurrence and advances the schedule.
 * A unique partial index on (userId, recurrenceId, recurrenceOccurrence) plus
 * an upsert makes this idempotent if the worker runs twice or restarts mid-run.
 */
async function processOne(recurring, now) {
  let current = recurring;
  let createdCount = 0;
  let guard = 0;

  while (current.active && current.nextOccurrence <= now && guard < 24) {
    guard += 1;
    const occurrence = current.nextOccurrence;

    if (current.endDate && occurrence > current.endDate) {
      current.active = false;
      await current.save();
      break;
    }

    const result = await Transaction.updateOne(
      {
        userId: current.userId,
        recurrenceId: current._id,
        recurrenceOccurrence: occurrence,
      },
      {
        $setOnInsert: {
          userId: current.userId,
          type: current.type,
          amountPaise: current.amountPaise,
          category: current.category,
          description: current.description,
          merchant: current.merchant,
          paymentMethod: current.paymentMethod,
          date: occurrence,
          tags: current.tags,
          notes: current.notes,
          recurrenceId: current._id,
          recurrenceOccurrence: occurrence,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount > 0) createdCount += 1;

    const next = frequencyNextDate(occurrence, current.frequency);
    const shouldDeactivate = Boolean(current.endDate && next > current.endDate);

    // Compare-and-set prevents two workers from advancing the same occurrence twice.
    current = await RecurringTransaction.findOneAndUpdate(
      { _id: current._id, nextOccurrence: occurrence },
      {
        $set: {
          nextOccurrence: next,
          active: !shouldDeactivate,
          lastProcessedAt: now,
        },
      },
      { returnDocument: 'after' },
    );

    if (!current) break;
  }

  return createdCount;
}

export async function processDueRecurring({ userId, now = new Date() } = {}) {
  const filter = { active: true, nextOccurrence: { $lte: now } };
  if (userId) filter.userId = userId;
  const due = await RecurringTransaction.find(filter).limit(200);
  let createdCount = 0;
  for (const recurring of due) {
    try {
      createdCount += await processOne(recurring, now);
    } catch (error) {
      console.error(`Recurring processing failed for ${recurring.id}:`, error.message);
    }
  }
  return { processed: due.length, createdCount };
}
