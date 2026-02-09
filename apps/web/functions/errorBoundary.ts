/**
 * Structured error handling and logging
 * Used by all backend functions to ensure consistent error responses
 */

export class AppError extends Error {
  constructor(code, message, statusCode = 500, details = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * Safe async wrapper that catches errors and returns normalized response
 */
export async function handleAsync(fn, errorCode = "INTERNAL_ERROR") {
  try {
    const result = await fn();
    return {
      status: "success",
      data: result,
    };
  } catch (error) {
    console.error(`[${errorCode}]`, error);

    // If already an AppError, return as-is
    if (error instanceof AppError) {
      return error.toJSON();
    }

    // Map common errors
    let statusCode = 500;
    let code = errorCode;

    if (error.message?.includes("not found")) {
      statusCode = 404;
      code = "NOT_FOUND";
    } else if (error.message?.includes("validation")) {
      statusCode = 400;
      code = "VALIDATION_ERROR";
    } else if (error.message?.includes("unauthorized")) {
      statusCode = 401;
      code = "UNAUTHORIZED";
    }

    return {
      error: {
        code,
        message: error.message || "An unexpected error occurred",
        statusCode,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Validate required params and throw AppError if missing
 */
export function validateRequired(obj, keys) {
  for (const key of keys) {
    if (!obj[key]) {
      throw new AppError(
        "MISSING_PARAM",
        `Missing required parameter: ${key}`,
        400,
        { parameter: key }
      );
    }
  }
}

/**
 * Log function execution with timing
 */
export function createLogger(name) {
  return {
    info: (msg, data) => console.log(`[${name}] ${msg}`, data || ""),
    warn: (msg, data) => console.warn(`[${name}] ${msg}`, data || ""),
    error: (msg, error) =>
      console.error(`[${name}] ${msg}`, error?.message || error),
    time: (label) => {
      const start = Date.now();
      return {
        end: () => {
          const duration = Date.now() - start;
          console.log(`[${name}] ${label} took ${duration}ms`);
        },
      };
    },
  };
}