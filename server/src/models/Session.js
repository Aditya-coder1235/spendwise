import mongoose from 'mongoose';
import { schemaOptions } from './schema-options.js';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      maxlength: 255,
      default: '',
    },
    ip: {
      type: String,
      maxlength: 64,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  schemaOptions,
);

// MongoDB removes expired refresh sessions automatically.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema);
