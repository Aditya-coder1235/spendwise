import mongoose from 'mongoose';
import { FREQUENCIES, PAYMENT_METHODS, TRANSACTION_TYPES } from '../utils/constants.js';
import { schemaOptions } from './schema-options.js';

const recurringTransactionSchema = new mongoose.Schema(
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
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    frequency: {
      type: String,
      enum: FREQUENCIES,
      required: true,
    },
    nextOccurrence: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastProcessedAt: {
      type: Date,
      default: null,
    },
  },
  schemaOptions,
);

recurringTransactionSchema.virtual('amount').get(function amountVirtual() {
  return Number((this.amountPaise / 100).toFixed(2));
});

recurringTransactionSchema.index({ userId: 1, active: 1, nextOccurrence: 1 });

export const RecurringTransaction = mongoose.model(
  'RecurringTransaction',
  recurringTransactionSchema,
);
