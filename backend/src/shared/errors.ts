// utils/errors.ts
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean; // distinguishes expected errors from bugs/crashes

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor); // cleaner stack traces
    }
}

export class ValidationError extends AppError {
    issues: unknown;
    constructor(issues: unknown) {
        super("Validation failed", 400);
        this.issues = issues;
    }
}

export class ConflictError extends AppError {
    constructor(message = "Resource already exists") {
        super(message, 409);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Not found") {
        super(message, 404);
    }
}

export class AuthError extends AppError {
    constructor(message = "Invalid credentials") {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden") {
        super(message, 403);
    }
}

export class RateLimitError extends AppError {
    constructor(message = "Too many requests") {
        super(message, 429);
    }
}