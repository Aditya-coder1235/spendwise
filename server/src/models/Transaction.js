import mongoose from 'mongoose';
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '../utils/constants.js';
import { schemaOptions } from './schema-options.js';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Amount must be an integer number of paise',
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    merchant: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'upi',
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 10 && tags.every((tag) => tag.length <= 30),
        message: 'Use at most 10 tags of up to 30 characters each',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    // Only set for transactions generated from a recurring template.
    recurrenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringTransaction',
      default: null,
    },
    recurrenceOccurrence: {
      type: Date,
      default: null,
    },
  },
  schemaOptions,
);

transactionSchema.index({ userId: 1, date: -1, _id: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.virtual('amount').get(function amountVirtual() {
  return Number((this.amountPaise / 100).toFixed(2));
});

transactionSchema.index(
  { userId: 1, recurrenceId: 1, recurrenceOccurrence: 1 },
  {
    unique: true,
    partialFilterExpression: {
      recurrenceId: { $type: 'objectId' },
      recurrenceOccurrence: { $type: 'date' },
    },
  },
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
