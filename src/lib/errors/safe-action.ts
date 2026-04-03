import { parseError } from './index';
import { logger } from '@/lib/logger';

export type ActionState<T> =
  | { success: true; data: T }
  | { success: false; error: { title: string; description: string } };

/**
 * Higher-Order Function (Wrapper) para proteger Server Actions.
 * 
 * Intercepta cualquier error (validación, DB, red, caídas abruptas),
 * lo loguea para auditoría y lo devuelve en un formato estándar 
 * que el frontend puede mostrar directamente en Sileo sin romper la UI.
 * 
 * @param actionFn La Server Action a ejecutar.
 * @param actionName Nombre de la acción para trazabilidad en logs (ej. "createSale").
 */
export function safeAction<TArgs extends any[], TReturn>(
  actionName: string,
  actionFn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<ActionState<TReturn>> {
  return async (...args: TArgs): Promise<ActionState<TReturn>> => {
    try {
      const result = await actionFn(...args);
      return { success: true, data: result };
    } catch (error) {
      const parsed = parseError(error);

      // Log the exact error on the server side for observability
      logger.error(`Action Failed: [${actionName}]`, {
        action: actionName,
        title: parsed.title,
        description: parsed.description,
        stack: error instanceof Error ? error.stack : undefined,
        rawError: error instanceof Error ? error.message : String(error)
      });

      // Silencing is forbidden. Always return the parsed structured error to the client.
      return { success: false, error: parsed };
    }
  };
}
