export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Re-export action factory
export { createAction, withLogging, wrapActions } from './action-factory';
export type { ActionResult, ActionOptions } from './action-factory';

export class DomainError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DOMAIN_ERROR', 400, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`Recurso no encontrado: ${resource}`, 'NOT_FOUND', 404);
  }
}

export class InfrastructureError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INFRASTRUCTURE_ERROR', 503, details);
  }
}

/**
 * Parses any unknown error caught in the application and standardizes it 
 * into a professional title and detailed description for UI display via Sileo.
 */
export function parseError(error: unknown): { title: string; description: string } {
  if (error instanceof AppError) {
    let description = error.message;
    if (error.details && Object.keys(error.details).length > 0) {
      try {
        description += ` - Detalles: ${JSON.stringify(error.details)}`;
      } catch {
        /* Ignore stringify error */
      }
    }
    return {
      title: error.code.replace(/_/g, ' '),
      description
    };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    
    // Network-level errors (browser/fetch API)
    if (msg === 'failed to fetch' || msg.includes('fetch failed') || msg.includes('network')) {
      return {
        title: 'Error de Conexión',
        description: 'No se pudo conectar con el servidor. Esto puede ocurrir si el servidor se está reiniciando, hay problemas de red, o estás sin conexión.',
      };
    }
    if (msg.includes('econnrefused')) {
      return {
        title: 'Conexión Rechazada',
        description: 'La base de datos o servicio externo rechazó la conexión. Verifica tu internet o el estado del proveedor.',
      };
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return {
        title: 'Tiempo de Espera Agotado',
        description: 'La operación tardó demasiado en responder. Intenta de nuevo en unos momentos.',
      };
    }
    if (msg.includes('abort') || msg.includes('cancelled')) {
      return {
        title: 'Operación Cancelada',
        description: 'La solicitud fue cancelada. Esto puede ocurrir al navegar rápidamente entre páginas.',
      };
    }
    // Zod Error string pattern matching or common DB errors can be checked here
    if (error.name === 'ZodError') {
      return {
        title: 'Error de Validación',
        description: 'Los datos enviados son inconsistentes o incompletos. Intenta corregir el formulario.',
      };
    }

    return {
      title: 'Error de Ejecución',
      description: error.message || 'Se produjo un error crítico no controlado en la aplicación.',
    };
  }

  // Fallback for non-Error thrown objects (strings, objects, nulls)
  return {
    title: 'Fallo Desconocido',
    description: typeof error === 'string' ? error : 'Ocurrió un error inesperado que no pudo ser procesado.',
  };
}
