export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: readonly unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
