/**
 * Tool Validation
 * Provides comprehensive validation for tool inputs and schemas
 */

import { 
  ToolSchema, 
  ToolProperty,
  ToolValidationResult,
  ToolValidationError,
  ToolValidationWarning
} from '../types';
import { sanitizeString } from '../utils';

/**
 * Validate tool input against schema
 */
export function validateToolInput(
  input: unknown, 
  schema: ToolSchema
): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  const warnings: ToolValidationWarning[] = [];

  try {
    // Basic type check
    if (typeof input !== 'object' || input === null) {
      errors.push({
        field: '',
        message: 'Input must be an object',
        code: 'INVALID_TYPE',
      });
      return { valid: false, errors, warnings };
    }

    const inputObj = input as Record<string, unknown>;

    // Validate required fields
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in inputObj) || inputObj[requiredField] === undefined) {
          errors.push({
            field: requiredField,
            message: `Required field '${requiredField}' is missing`,
            code: 'MISSING_REQUIRED_FIELD',
          });
        }
      }
    }

    // Validate each property
    for (const [fieldName, fieldValue] of Object.entries(inputObj)) {
      const property = schema.properties[fieldName];
      
      if (!property && !schema.additionalProperties) {
        errors.push({
          field: fieldName,
          message: `Unexpected field '${fieldName}'`,
          code: 'UNEXPECTED_FIELD',
        });
        continue;
      }

      if (property) {
        const fieldValidation = validateProperty(fieldName, fieldValue, property);
        errors.push(...fieldValidation.errors);
        warnings.push(...fieldValidation.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };

  } catch (error) {
    errors.push({
      field: '',
      message: error instanceof Error ? error.message : 'Validation failed',
      code: 'VALIDATION_ERROR',
    });
    return { valid: false, errors, warnings };
  }
}

/**
 * Validate a single property against its schema
 */
function validateProperty(
  fieldName: string, 
  value: unknown, 
  property: ToolProperty
): { errors: ToolValidationError[]; warnings: ToolValidationWarning[] } {
  const errors: ToolValidationError[] = [];
  const warnings: ToolValidationWarning[] = [];

  // Type validation
  const typeValidation = validatePropertyType(fieldName, value, property);
  if (!typeValidation.valid) {
    errors.push(...typeValidation.errors);
    return { errors, warnings };
  }

  // String validation
  if (property.type === 'string') {
    const stringValidation = validateStringProperty(fieldName, value as string, property);
    errors.push(...stringValidation.errors);
    warnings.push(...stringValidation.warnings);
  }

  // Number validation
  if (property.type === 'number') {
    const numberValidation = validateNumberProperty(fieldName, value as number, property);
    errors.push(...numberValidation.errors);
    warnings.push(...numberValidation.warnings);
  }

  // Array validation
  if (property.type === 'array' && property.items) {
    const arrayValidation = validateArrayProperty(fieldName, value as unknown[], property);
    errors.push(...arrayValidation.errors);
    warnings.push(...arrayValidation.warnings);
  }

  // Object validation
  if (property.type === 'object' && property.properties) {
    const objectValidation = validateObjectProperty(fieldName, value as Record<string, unknown>, property);
    errors.push(...objectValidation.errors);
    warnings.push(...objectValidation.warnings);
  }

  return { errors, warnings };
}

/**
 * Validate property type
 */
function validatePropertyType(
  fieldName: string, 
  value: unknown, 
  property: ToolProperty
): { valid: boolean; errors: ToolValidationError[] } {
  const errors: ToolValidationError[] = [];

  switch (property.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be a string`,
          code: 'INVALID_TYPE',
          value,
        });
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be a number`,
          code: 'INVALID_TYPE',
          value,
        });
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be a boolean`,
          code: 'INVALID_TYPE',
          value,
        });
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be an array`,
          code: 'INVALID_TYPE',
          value,
        });
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be an object`,
          code: 'INVALID_TYPE',
          value,
        });
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate string property
 */
function validateStringProperty(
  fieldName: string, 
  value: string, 
  property: ToolProperty
): { errors: ToolValidationError[]; warnings: ToolValidationWarning[] } {
  const errors: ToolValidationError[] = [];
  const warnings: ToolValidationWarning[] = [];

  // Enum validation
  if (property.enum && !property.enum.includes(value)) {
    errors.push({
      field: fieldName,
      message: `Field '${fieldName}' must be one of: ${property.enum.join(', ')}`,
      code: 'INVALID_ENUM_VALUE',
      value,
    });
  }

  // Pattern validation
  if (property.pattern) {
    const regex = new RegExp(property.pattern);
    if (!regex.test(value)) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' does not match pattern: ${property.pattern}`,
        code: 'PATTERN_MISMATCH',
        value,
      });
    }
  }

  // Format validation
  if (property.format) {
    const formatValidation = validateStringFormat(fieldName, value, property.format);
    if (!formatValidation.valid) {
      errors.push(...formatValidation.errors);
    }
  }

  return { errors, warnings };
}

/**
 * Validate number property
 */
function validateNumberProperty(
  fieldName: string, 
  value: number, 
  property: ToolProperty
): { errors: ToolValidationError[]; warnings: ToolValidationWarning[] } {
  const errors: ToolValidationError[] = [];
  const warnings: ToolValidationWarning[] = [];

  // Minimum validation
  if (property.minimum !== undefined && value < property.minimum) {
    errors.push({
      field: fieldName,
      message: `Field '${fieldName}' must be at least ${property.minimum}`,
      code: 'BELOW_MINIMUM',
      value,
    });
  }

  // Maximum validation
  if (property.maximum !== undefined && value > property.maximum) {
    errors.push({
      field: fieldName,
      message: `Field '${fieldName}' must be at most ${property.maximum}`,
      code: 'ABOVE_MAXIMUM',
      value,
    });
  }

  return { errors, warnings };
}

/**
 * Validate array property
 */
function validateArrayProperty(
  fieldName: string, 
  value: unknown[], 
  property: ToolProperty
): { errors: ToolValidationError[]; warnings: ToolValidationWarning[] } {
  const errors: ToolValidationError[] = [];
  const warnings: ToolValidationWarning[] = [];

  if (!property.items) {
    return { errors, warnings };
  }

  // Validate each array item
  for (let i = 0; i < value.length; i++) {
    const itemValidation = validateProperty(`${fieldName}[${i}]`, value[i], property.items);
    errors.push(...itemValidation.errors);
    warnings.push(...itemValidation.warnings);
  }

  return { errors, warnings };
}

/**
 * Validate object property
 */
function validateObjectProperty(
  fieldName: string, 
  value: Record<string, unknown>, 
  property: ToolProperty
): { errors: ToolValidationError[]; warnings: ToolValidationWarning[] } {
  const errors: ToolValidationError[] = [];
  const warnings: ToolValidationWarning[] = [];

  if (!property.properties) {
    return { errors, warnings };
  }

  // Validate each object property
  for (const [propName, propValue] of Object.entries(value)) {
    const propSchema = property.properties[propName];
    if (propSchema) {
      const propValidation = validateProperty(`${fieldName}.${propName}`, propValue, propSchema);
      errors.push(...propValidation.errors);
      warnings.push(...propValidation.warnings);
    }
  }

  return { errors, warnings };
}

/**
 * Validate string format
 */
function validateStringFormat(
  fieldName: string, 
  value: string, 
  format: string
): { valid: boolean; errors: ToolValidationError[] } {
  const errors: ToolValidationError[] = [];

  switch (format) {
    case 'email':
      if (!isValidEmail(value)) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be a valid email address`,
          code: 'INVALID_EMAIL',
          value,
        });
      }
      break;

    case 'uri':
      if (!isValidUri(value)) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be a valid URI`,
          code: 'INVALID_URI',
          value,
        });
      }
      break;

    case 'date':
      if (!isValidDate(value)) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be a valid date`,
          code: 'INVALID_DATE',
          value,
        });
      }
      break;

    case 'date-time':
      if (!isValidDateTime(value)) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be a valid date-time`,
          code: 'INVALID_DATE_TIME',
          value,
        });
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate tool schema
 */
export function validateToolSchema(schema: ToolSchema): ToolValidationResult {
  const errors: ToolValidationError[] = [];
  const warnings: ToolValidationWarning[] = [];

  try {
    // Basic schema validation
    if (!schema || typeof schema !== 'object') {
      errors.push({
        field: '',
        message: 'Invalid tool schema structure',
        code: 'INVALID_SCHEMA',
      });
      return { valid: false, errors, warnings };
    }

    // Validate schema type
    if (schema.type !== 'object') {
      errors.push({
        field: '',
        message: 'Tool schema must have type "object"',
        code: 'INVALID_SCHEMA_TYPE',
      });
    }

    // Validate properties
    if (!schema.properties || typeof schema.properties !== 'object') {
      errors.push({
        field: '',
        message: 'Tool schema must have properties object',
        code: 'MISSING_PROPERTIES',
      });
    } else {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const propValidation = validatePropertySchema(propName, propSchema);
        errors.push(...propValidation.errors);
        warnings.push(...propValidation.warnings);
      }
    }

    // Validate required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (typeof requiredField !== 'string') {
          errors.push({
            field: '',
            message: 'Required fields must be strings',
            code: 'INVALID_REQUIRED_FIELD',
          });
        } else if (!schema.properties[requiredField]) {
          errors.push({
            field: '',
            message: `Required field '${requiredField}' is not defined in properties`,
            code: 'UNDEFINED_REQUIRED_FIELD',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };

  } catch (error) {
    errors.push({
      field: '',
      message: error instanceof Error ? error.message : 'Schema validation failed',
      code: 'SCHEMA_VALIDATION_ERROR',
    });
    return { valid: false, errors, warnings };
  }
}

/**
 * Validate property schema
 */
function validatePropertySchema(
  propName: string, 
  property: ToolProperty
): { errors: ToolValidationError[]; warnings: ToolValidationWarning[] } {
  const errors: ToolValidationError[] = [];
  const warnings: ToolValidationWarning[] = [];

  // Validate property type
  const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
  if (!validTypes.includes(property.type)) {
    errors.push({
      field: propName,
      message: `Invalid property type: ${property.type}`,
      code: 'INVALID_PROPERTY_TYPE',
    });
  }

  // Validate enum values
  if (property.enum && !Array.isArray(property.enum)) {
    errors.push({
      field: propName,
      message: 'Enum values must be an array',
      code: 'INVALID_ENUM',
    });
  }

  // Validate pattern
  if (property.pattern && typeof property.pattern !== 'string') {
    errors.push({
      field: propName,
      message: 'Pattern must be a string',
      code: 'INVALID_PATTERN',
    });
  }

  // Validate numeric constraints
  if (property.minimum !== undefined && typeof property.minimum !== 'number') {
    errors.push({
      field: propName,
      message: 'Minimum must be a number',
      code: 'INVALID_MINIMUM',
    });
  }

  if (property.maximum !== undefined && typeof property.maximum !== 'number') {
    errors.push({
      field: propName,
      message: 'Maximum must be a number',
      code: 'INVALID_MAXIMUM',
    });
  }

  return { errors, warnings };
}

/**
 * Sanitize tool input
 */
export function sanitizeToolInput(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeString(key)] = sanitizeToolInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Utility functions for format validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUri(uri: string): boolean {
  try {
    new URL(uri);
    return true;
  } catch {
    return false;
  }
}

function isValidDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

function isValidDateTime(dateTime: string): boolean {
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!dateTimeRegex.test(dateTime)) {
    return false;
  }
  const parsed = new Date(dateTime);
  return !isNaN(parsed.getTime());
} 