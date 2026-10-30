import { supabase } from '../lib/supabase';

const ROLE_PREFIXES = {
  Admin: 'ADM',
  HR: 'HR',
  Employee: 'EMP',
  Intern: 'INT',
};

/**
 * Generate the next company user ID using the database sequence.
 * Expected formats: ADM0001, HR0001, EMP0001, INT0001.
 *
 * The database should generate IDs atomically to prevent duplicate IDs
 * when multiple users are created simultaneously.
 */
export async function generateUserId(role) {
  const normalizedRole =
    typeof role === 'string'
      ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
      : '';

  const prefix = ROLE_PREFIXES[normalizedRole];

  if (!prefix) {
    throw new Error('Invalid role. Expected Admin, HR, Employee, or Intern.');
  }

  const { data, error } = await supabase.rpc('generate_user_code', {
    role_name: normalizedRole,
  });

  if (error) {
    console.error('Failed to generate company user ID:', error);
    throw new Error('Unable to generate a user ID.');
  }

  if (typeof data !== 'string' || !data.startsWith(prefix)) {
    throw new Error(
      'The database returned an invalid user ID. Check the generate_user_code function.'
    );
  }

  return data;
}

/**
 * Return the role prefix for a supported role.
 */
export function getUserIdPrefix(role) {
  const normalizedRole =
    typeof role === 'string'
      ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
      : '';

  return ROLE_PREFIXES[normalizedRole] || null;
}

/**
 * Validate a company user ID against the expected role prefix and format.
 */
export function isValidUserId(userId, role) {
  if (typeof userId !== 'string') return false;

  const prefix = getUserIdPrefix(role);

  if (!prefix) return false;

  return new RegExp(`^${prefix}\\d{4,}$`).test(userId.trim().toUpperCase());
}

export default generateUserId;