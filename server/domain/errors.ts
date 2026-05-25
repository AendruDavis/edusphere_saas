export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function assertFound<T>(value: T | null | undefined, message = "Record not found"): T {
  if (value === null || value === undefined) {
    throw new AppError(404, message);
  }

  return value;
}
