const DATE_OPTIONS = {
  date: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
  dateTime: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  time: {
    hour: '2-digit',
    minute: '2-digit',
  },
  longDate: {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
};

const isValidDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const date = value instanceof Date ? value : new Date(value);

  return !Number.isNaN(date.getTime());
};

const toDate = (value) => {
  if (!isValidDate(value)) return null;

  return value instanceof Date ? value : new Date(value);
};

/**
 * Format a date as: Oct 23, 2026
 */
export function formatDate(value, options = {}) {
  const date = toDate(value);

  if (!date) return 'N/A';

  const {
    locale = 'en-IN',
    ...customOptions
  } = options;

  return new Intl.DateTimeFormat(locale, {
    ...DATE_OPTIONS.date,
    ...customOptions,
  }).format(date);
}

/**
 * Format a date and time.
 * Example: Oct 23, 2026, 10:30 PM
 */
export function formatDateTime(value, options = {}) {
  const date = toDate(value);

  if (!date) return 'N/A';

  const {
    locale = 'en-IN',
    ...customOptions
  } = options;

  return new Intl.DateTimeFormat(locale, {
    ...DATE_OPTIONS.dateTime,
    ...customOptions,
  }).format(date);
}

/**
 * Format only the time.
 * Example: 10:30 PM
 */
export function formatTime(value, options = {}) {
  const date = toDate(value);

  if (!date) return 'N/A';

  const {
    locale = 'en-IN',
    ...customOptions
  } = options;

  return new Intl.DateTimeFormat(locale, {
    ...DATE_OPTIONS.time,
    ...customOptions,
  }).format(date);
}

/**
 * Format a date in a long, readable format.
 * Example: Friday, October 23, 2026
 */
export function formatLongDate(value, options = {}) {
  const date = toDate(value);

  if (!date) return 'N/A';

  const {
    locale = 'en-IN',
    ...customOptions
  } = options;

  return new Intl.DateTimeFormat(locale, {
    ...DATE_OPTIONS.longDate,
    ...customOptions,
  }).format(date);
}

/**
 * Format a date using a custom Intl.DateTimeFormat configuration.
 */
export function formatCustomDate(value, options = {}, locale = 'en-IN') {
  const date = toDate(value);

  if (!date) return 'N/A';

  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Return a relative date label.
 * Examples: Just now, 5 minutes ago, 2 hours ago, Yesterday.
 */
export function formatRelativeDate(value) {
  const date = toDate(value);

  if (!date) return 'N/A';

  const now = new Date();
  const difference = now.getTime() - date.getTime();

  if (difference < 0) {
    const futureMinutes = Math.ceil(Math.abs(difference) / 60000);

    if (futureMinutes < 60) {
      return `In ${futureMinutes} minute${futureMinutes === 1 ? '' : 's'}`;
    }

    const futureHours = Math.ceil(futureMinutes / 60);

    if (futureHours < 24) {
      return `In ${futureHours} hour${futureHours === 1 ? '' : 's'}`;
    }

    return formatDate(date);
  }

  const seconds = Math.floor(difference / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfYesterday && date < startOfToday) {
    return 'Yesterday';
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(days / 365);

  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Format a date for HTML date inputs: YYYY-MM-DD.
 */
export function formatDateForInput(value) {
  const date = toDate(value);

  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format a date for HTML datetime-local inputs: YYYY-MM-DDTHH:mm.
 */
export function formatDateTimeForInput(value) {
  const date = toDate(value);

  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Check whether a value represents a valid date.
 */
export function isDateValid(value) {
  return isValidDate(value);
}

/**
 * Return the number of whole days between two dates.
 */
export function daysBetween(startValue, endValue = new Date()) {
  const startDate = toDate(startValue);
  const endDate = toDate(endValue);

  if (!startDate || !endDate) return null;

  const start = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );

  const end = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );

  return Math.round(Math.abs(end - start) / 86400000);
}

/**
 * Compare two dates by calendar day.
 */
export function isSameDay(firstValue, secondValue) {
  const first = toDate(firstValue);
  const second = toDate(secondValue);

  if (!first || !second) return false;

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

/**
 * Return true if the provided date is today.
 */
export function isToday(value) {
  return isSameDay(value, new Date());
}

/**
 * Return true if the provided date is in the past.
 */
export function isPastDate(value) {
  const date = toDate(value);

  return date ? date.getTime() < Date.now() : false;
}

/**
 * Return true if the provided date is in the future.
 */
export function isFutureDate(value) {
  const date = toDate(value);

  return date ? date.getTime() > Date.now() : false;
}

/**
 * Format a date range.
 * Example: Oct 1, 2026 – Oct 23, 2026
 */
export function formatDateRange(startValue, endValue, options = {}) {
  const startDate = toDate(startValue);
  const endDate = toDate(endValue);

  if (!startDate && !endDate) return 'N/A';
  if (!startDate) return `Until ${formatDate(endDate, options)}`;
  if (!endDate) return `From ${formatDate(startDate, options)}`;

  return `${formatDate(startDate, options)} – ${formatDate(endDate, options)}`;
}

/**
 * Format a date for compact display in tables.
 * Example: 23 Oct 2026
 */
export function formatShortDate(value) {
  return formatDate(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default formatDate;