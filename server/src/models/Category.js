import mongoose from 'mongoose';
import { TRANSACTION_TYPES } from '../utils/constants.js';
import { schemaOptions } from './schema-options.js';

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    nameKey: {
      type: String,
      required: true,
      select: false,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },
    color: {
      type: String,
      required: true,
      match: /^#[0-9a-f]{6}$/i,
      default: '#64748b',
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'tag',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  schemaOptions,
);

categorySchema.pre('validate', function setCategoryKey() {
  if (this.name) this.nameKey = this.name.trim().toLowerCase();
});

// Default categories are copied per user, so users can safely customise their own list.
categorySchema.index({ userId: 1, type: 1, nameKey: 1 }, { unique: true });
categorySchema.index({ userId: 1, type: 1, name: 1 });

export const Category = mongoose.model('Category', categorySchema);
