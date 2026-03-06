/**
 * Phone number validation utilities for E.164 format.
 */

/**
 * Validate and normalize a phone number to E.164 format.
 * Primarily designed for Philippine phone numbers.
 *
 * @param {string} phoneNumber - Raw phone number input
 * @returns {object} { isValid: boolean, normalized: string, error: string }
 */
export const validateAndNormalizePhone = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { isValid: false, normalized: '', error: 'Phone number is required' };
  }

  const cleaned = phoneNumber.trim().replace(/[\s\-\(\)\.]/g, '');

  if (!cleaned) {
    return { isValid: false, normalized: '', error: 'Phone number cannot be empty' };
  }

  let normalized = cleaned;

  // If starts with 0, assume Philippines and convert to +63
  if (normalized.startsWith('0')) {
    normalized = '+63' + normalized.slice(1);
  }
  // If doesn't start with +, assume Philippines
  else if (!normalized.startsWith('+')) {
    normalized = '+63' + normalized;
  }

  // Basic E.164 validation: +<country_code><number>
  // Philippines: +63 followed by 9-10 digits
  const e164Regex = /^\+63\d{9,10}$/;
  if (!e164Regex.test(normalized)) {
    return {
      isValid: false,
      normalized: '',
      error: 'Invalid phone number format. Use format like 09123456789 or +639123456789'
    };
  }

  return { isValid: true, normalized, error: '' };
};

/**
 * Check if a phone number is valid.
 *
 * @param {string} phoneNumber - Raw phone number input
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidPhoneNumber = (phoneNumber) => {
  const result = validateAndNormalizePhone(phoneNumber);
  return result.isValid;
};

/**
 * Get a user-friendly error message for invalid phone numbers.
 *
 * @param {string} phoneNumber - Raw phone number input
 * @returns {string} Error message or empty string if valid
 */
export const getPhoneValidationError = (phoneNumber) => {
  const result = validateAndNormalizePhone(phoneNumber);
  return result.error;
};
