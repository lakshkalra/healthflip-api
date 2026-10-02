export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const unauthorized = () =>
  new AppError('UNAUTHORIZED', 401, 'A valid guest session token is required.');

export const notFound = (resource: string) =>
  new AppError('NOT_FOUND', 404, `${resource} was not found.`);

export const validationError = (details: unknown) =>
  new AppError('VALIDATION_ERROR', 400, 'The request is invalid.', details);
