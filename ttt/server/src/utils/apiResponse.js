export function successResponse(res, data, statusCode = 200, meta = undefined) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function errorResponse(res, error) {
  const statusCode = error.statusCode || 500;
  const body = {
    success: false,
    message: error.message || 'Internal Server Error',
  };
  if (error.errors && error.errors.length > 0) {
    body.errors = error.errors;
  }
  return res.status(statusCode).json(body);
}