import { ZodError } from 'zod';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ApiError, isApiError } from '../utils/apiError.js';
import { errorResponse } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

function handleZodError(err) {
  const errors = err.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }));
  return new ApiError(400, 'Validation failed', errors);
}

function handleMongooseValidationError(err) {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new ApiError(400, 'Validation failed', errors);
}

function handleCastError(err) {
  return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
}

function handleDuplicateKeyError(err) {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new ApiError(409, `${field} '${value}' already exists`);
}

function handleJwtError() {
  return new ApiError(401, 'Invalid token. Please log in again.');
}

function handleTokenExpiredError() {
  return new ApiError(401, 'Token expired. Please log in again.');
}

export function errorHandler(err, req, res, _next) {
  if (env.NODE_ENV !== 'test') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  let apiError = err;

  if (err instanceof ZodError) {
    apiError = handleZodError(err);
  } else if (err instanceof mongoose.Error.ValidationError) {
    apiError = handleMongooseValidationError(err);
  } else if (err instanceof mongoose.Error.CastError) {
    apiError = handleCastError(err);
  } else if (err instanceof MongoServerError && err.code === 11000) {
    apiError = handleDuplicateKeyError(err);
  } else if (err.name === 'JsonWebTokenError') {
    apiError = handleJwtError();
  } else if (err.name === 'TokenExpiredError') {
    apiError = handleTokenExpiredError();
  } else if (!isApiError(err)) {
    apiError = new ApiError(500, 'Internal Server Error');
  }

  return errorResponse(res, apiError);
}

export function notFoundHandler(req, res) {
  return errorResponse(res, new ApiError(404, `Route ${req.method} ${req.path} not found`));
}