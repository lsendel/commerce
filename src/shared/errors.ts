export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} not found: ${id}` : `${entity} not found`, "NOT_FOUND");
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class AuthError extends DomainError {
  constructor(message = "Authentication required") {
    super(message, "AUTH_ERROR");
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}

export class ExpiredError extends DomainError {
  constructor(message = "Resource has expired") {
    super(message, "EXPIRED");
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Access denied") {
    super(message, "FORBIDDEN");
  }
}
