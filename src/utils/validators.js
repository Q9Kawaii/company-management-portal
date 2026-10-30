const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USER_ID_REGEX = /^(ADM|HR|EMP|INT)\d{4,}$/i;

const PASSWORD_MIN_LENGTH = 8;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

const PROJECT_NAME_MIN_LENGTH = 3;
const PROJECT_NAME_MAX_LENGTH = 150;

const DESCRIPTION_MAX_LENGTH = 5000;

const ALLOWED_ROLES = ['Admin', 'HR', 'Employee', 'Intern'];

const ALLOWED_PROJECT_CATEGORIES = ['Intern-Based', 'Main Project'];

const ALLOWED_PROJECT_STATUSES = [
  'draft',
  'published',
  'active',
  'in_progress',
  'completed',
  'archived',
];

const ALLOWED_TIMELINE_TYPES = ['main', 'staff'];

const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
];

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : '';

export const isRequired = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;

  return value !== null && value !== undefined;
};

export const isValidEmail = (email) =>
  EMAIL_REGEX.test(normalizeString(email));

export const isValidUserId = (userId) =>
  USER_ID_REGEX.test(normalizeString(userId));

export const isValidPassword = (password) =>
  typeof password === 'string' &&
  password.length >= PASSWORD_MIN_LENGTH;

export const validatePassword = (password) => {
  const errors = [];

  if (!isRequired(password)) {
    errors.push('Password is required.');
    return errors;
  }

  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    errors.push(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
    );
  }

  if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters.');
  }

  return errors;
};

export const validateName = (name) => {
  const value = normalizeString(name);
  const errors = [];

  if (!value) {
    errors.push('Name is required.');
  } else {
    if (value.length < NAME_MIN_LENGTH) {
      errors.push(`Name must contain at least ${NAME_MIN_LENGTH} characters.`);
    }

    if (value.length > NAME_MAX_LENGTH) {
      errors.push(`Name cannot exceed ${NAME_MAX_LENGTH} characters.`);
    }
  }

  return errors;
};

export const isValidName = (name) =>
  validateName(name).length === 0;

export const isValidRole = (role) =>
  ALLOWED_ROLES.includes(normalizeString(role));

export const isValidProjectCategory = (category) =>
  ALLOWED_PROJECT_CATEGORIES.includes(normalizeString(category));

export const isValidProjectStatus = (status) =>
  ALLOWED_PROJECT_STATUSES.includes(normalizeString(status));

export const isValidTimelineType = (type) =>
  ALLOWED_TIMELINE_TYPES.includes(normalizeString(type));

export const validateUser = (user, options = {}) => {
  const { isEditing = false, requirePassword = !isEditing } = options;
  const errors = {};

  const nameErrors = validateName(user?.name);
  if (nameErrors.length) errors.name = nameErrors[0];

  if (!isRequired(user?.email)) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(user.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!isValidRole(user?.role)) {
    errors.role = 'Select a valid role.';
  }

  if (user?.department && normalizeString(user.department).length > 100) {
    errors.department = 'Department cannot exceed 100 characters.';
  }

  if (requirePassword || isRequired(user?.password)) {
    const passwordErrors = validatePassword(user?.password);

    if (passwordErrors.length) {
      errors.password = passwordErrors[0];
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateProject = (project) => {
  const errors = {};
  const name = normalizeString(project?.name);
  const description = normalizeString(project?.description);

  if (!name) {
    errors.name = 'Project name is required.';
  } else if (name.length < PROJECT_NAME_MIN_LENGTH) {
    errors.name = `Project name must contain at least ${PROJECT_NAME_MIN_LENGTH} characters.`;
  } else if (name.length > PROJECT_NAME_MAX_LENGTH) {
    errors.name = `Project name cannot exceed ${PROJECT_NAME_MAX_LENGTH} characters.`;
  }

  if (!isValidProjectCategory(project?.category)) {
    errors.category = 'Select a valid project category.';
  }

  if (!description) {
    errors.description = 'Project description is required.';
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`;
  }

  if (!isRequired(project?.leadId ?? project?.lead_id)) {
    errors.leadId = 'Select a project lead.';
  }

  const memberIds = project?.memberIds ?? project?.member_ids;

  if (!Array.isArray(memberIds)) {
    errors.memberIds = 'Project members must be provided as a list.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateTimelineEntry = (entry) => {
  const errors = {};
  const content = normalizeString(entry?.content ?? entry?.text);

  if (!content) {
    errors.content = 'Timeline message cannot be empty.';
  } else if (content.length > DESCRIPTION_MAX_LENGTH) {
    errors.content = `Timeline message cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`;
  }

  if (
    entry?.timelineType !== undefined &&
    !isValidTimelineType(entry.timelineType)
  ) {
    errors.timelineType = 'Invalid timeline type.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateAttachment = (
  file,
  { maxSizeMB = 10, allowedTypes = ALLOWED_ATTACHMENT_TYPES } = {}
) => {
  if (!file) {
    return { isValid: false, error: 'Select a file to upload.' };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      isValid: false,
      error: `File size cannot exceed ${maxSizeMB} MB.`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'This file type is not allowed.',
    };
  }

  return { isValid: true, error: '' };
};

export const isValidAttachment = (file, options) =>
  validateAttachment(file, options).isValid;

export const validateSearchQuery = (query, maxLength = 200) => {
  const value = normalizeString(query);

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `Search query cannot exceed ${maxLength} characters.`,
    };
  }

  return { isValid: true, error: '' };
};

export const isValidUUID = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );

export const isValidDate = (value) => {
  if (!value) return false;

  const date = value instanceof Date ? value : new Date(value);

  return !Number.isNaN(date.getTime());
};

export const validateDateRange = (startDate, endDate) => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return {
      isValid: false,
      error: 'Enter valid start and end dates.',
    };
  }

  if (new Date(endDate) < new Date(startDate)) {
    return {
      isValid: false,
      error: 'End date cannot be earlier than start date.',
    };
  }

  return { isValid: true, error: '' };
};

export const validateForm = (values, rules) => {
  const errors = {};

  Object.entries(rules).forEach(([field, fieldRules]) => {
    const value = values?.[field];

    for (const rule of fieldRules) {
      const result = rule.validate(value, values);

      if (result !== true) {
        errors[field] =
          typeof result === 'string'
            ? result
            : rule.message || 'Invalid value.';

        break;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validators = {
  required: (message = 'This field is required.') => ({
    validate: (value) => isRequired(value) || message,
  }),

  email: (message = 'Enter a valid email address.') => ({
    validate: (value) => !isRequired(value) || isValidEmail(value) || message,
  }),

  minLength: (length, message) => ({
    validate: (value) =>
      !isRequired(value) ||
      (typeof value === 'string' && value.length >= length) ||
      message ||
      `Must contain at least ${length} characters.`,
  }),

  maxLength: (length, message) => ({
    validate: (value) =>
      !isRequired(value) ||
      (typeof value === 'string' && value.length <= length) ||
      message ||
      `Cannot exceed ${length} characters.`,
  }),

  password: (message = 'Password must be at least 8 characters long.') => ({
    validate: (value) => !isRequired(value) || isValidPassword(value) || message,
  }),
};

export {
  ALLOWED_ROLES,
  ALLOWED_PROJECT_CATEGORIES,
  ALLOWED_PROJECT_STATUSES,
  ALLOWED_TIMELINE_TYPES,
  ALLOWED_ATTACHMENT_TYPES,
  PASSWORD_MIN_LENGTH,
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
};

export default {
  isRequired,
  isValidEmail,
  isValidUserId,
  isValidPassword,
  validatePassword,
  validateName,
  isValidName,
  isValidRole,
  isValidProjectCategory,
  isValidProjectStatus,
  isValidTimelineType,
  validateUser,
  validateProject,
  validateTimelineEntry,
  validateAttachment,
  isValidAttachment,
  validateSearchQuery,
  isValidUUID,
  isValidDate,
  validateDateRange,
  validateForm,
  validators,
};