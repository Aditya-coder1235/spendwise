import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { CURRENCIES, DATE_FORMATS, THEMES } from '../utils/constants.js';
import { schemaOptions } from './schema-options.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    preferredCurrency: {
      type: String,
      enum: CURRENCIES,
      default: 'INR',
    },
    theme: {
      type: String,
      enum: THEMES,
      default: 'light',
    },
    dateFormat: {
      type: String,
      enum: DATE_FORMATS,
      default: 'DD/MM/YYYY',
    },
    warningThreshold: {
      type: Number,
      min: 50,
      max: 100,
      default: 80,
    },
  },
  schemaOptions,
);

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
