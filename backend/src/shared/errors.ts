
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
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

export class InvalidImageError extends AppError {
    constructor(message = "Invalid image") {
        super(message, 400);
    }
}

export class UnsupportedMediaTypeError extends AppError {
    constructor(message = "Unsupported media type") {
        super(message, 415);
    }
}