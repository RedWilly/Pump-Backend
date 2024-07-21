export class AppError extends Error {
    constructor(public statusCode: number, message: string) {
      super(message);
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(resource: string) {
      super(404, `${resource} not found`);
    }
  }
  
  export class ValidationError extends AppError {
    constructor(message: string) {
      super(400, message);
    }
  }
  
  export class DatabaseError extends AppError {
    constructor(message: string) {
      super(500, `Database error: ${message}`);
    }
  }