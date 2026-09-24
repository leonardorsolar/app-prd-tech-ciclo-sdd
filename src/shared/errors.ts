export interface ErrorDetail {
  param: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(details: ErrorDetail[]) {
    super(400, 'validation_error', 'Parâmetros inválidos', details);
  }
}
