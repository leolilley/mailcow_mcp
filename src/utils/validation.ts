import { z, ZodSchema } from 'zod';
import validator from 'validator';

export function validateEmail(email: string): boolean {
  return validator.isEmail(email);
}

export function validateDomain(domain: string): boolean {
  // validator.isFQDN checks for fully qualified domain names
  return validator.isFQDN(domain);
}

export function validateAPIKey(apiKey: string): boolean {
  return apiKey.length >= 32 && /^[a-zA-Z0-9]+$/.test(apiKey);
}

export function validateWithSchema<T>(data: unknown, schema: ZodSchema<T>): { success: boolean; data?: T; errors?: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      success: false,
      errors: ['Validation failed'],
    };
  }
} 