import mongoose from 'mongoose';
import { schemaOptions } from './schema-options.js';

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // null means the overall monthly expense budget.
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    period: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    monthlyLimitPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Budget must be an integer number of paise',
      },
    },
  },
  schemaOptions,
);

budgetSchema.virtual('monthlyLimit').get(function monthlyLimitVirtual() {
  return Number((this.monthlyLimitPaise / 100).toFixed(2));
});

budgetSchema.index({ userId: 1, period: 1, category: 1 }, { unique: true });
budgetSchema.index({ userId: 1, period: 1 });

export const Budget = mongoose.model('Budget', budgetSchema);
