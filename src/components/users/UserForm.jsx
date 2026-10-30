import { useEffect, useState } from 'react';

const INITIAL_FORM = {
  name: '',
  email: '',
  role: 'Employee',
  department: '',
  password: '',
};

const ROLE_OPTIONS = ['Admin', 'HR', 'Employee', 'Intern'];
const MIN_PASSWORD_LENGTH = 12;

export default function UserForm({
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
  submitText = 'Save User',
  allowedRoles = ROLE_OPTIONS,
  isEditing = false,
  className = '',
}) {
  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
    ...initialValues,
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    setFormData({
      ...INITIAL_FORM,
      ...initialValues,
      password: '',
    });
    setErrors({});
    setSubmitError('');
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: '',
    }));

    setSubmitError('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!formData.role) {
      nextErrors.role = 'Please select a role.';
    } else if (!allowedRoles.includes(formData.role)) {
      nextErrors.role = 'This role is not permitted.';
    }

    if (!isEditing && !formData.password) {
      nextErrors.password = 'Password is required.';
    } else if (
      formData.password &&
      formData.password.length < MIN_PASSWORD_LENGTH
    ) {
      nextErrors.password = `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getErrorMessage = (error) => {
    const message =
      typeof error === 'string'
        ? error
        : error?.message ||
          error?.context?.error ||
          error?.error_description ||
          '';

    if (!message) {
      return 'Unable to save the account. Please try again.';
    }

    if (/initial password must be at least 12 characters/i.test(message)) {
      return 'Password must contain at least 12 characters.';
    }

    if (/password.*(least|minimum|min).*12 characters/i.test(message)) {
      return 'Password must contain at least 12 characters.';
    }

    if (/user already registered|already exists/i.test(message)) {
      return 'An account with this email address already exists.';
    }

    if (/invalid email/i.test(message)) {
      return 'Please enter a valid email address.';
    }

    if (/weak password|password.*too short/i.test(message)) {
      return 'Please choose a stronger password with at least 12 characters.';
    }

    return message;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setSubmitError('');

    if (!validate()) return;

    const payload = {
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      department: formData.department.trim(),
    };

    if (isEditing && !payload.password) {
      delete payload.password;
    }

    try {
      const result = await onSubmit?.(payload);

      // Supports handlers that return { success: false, error: "..." }.
      if (result?.success === false || result?.error) {
        setSubmitError(getErrorMessage(result.error));
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  };

  const inputClass = (field) =>
    `mt-1 block w-full min-w-0 rounded-xl border bg-slate-900 px-3 py-3 text-base text-white outline-none transition-colors placeholder:text-slate-500 sm:text-sm ${
      errors[field]
        ? 'border-red-400 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-400/30'
        : 'border-slate-700 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/30'
    } disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none`;

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${className}`}>
      {submitError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <p className="font-semibold text-red-300">Unable to save account</p>
          <p className="mt-1 break-words">{submitError}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="user-name"
          className="block text-sm font-medium text-slate-200"
        >
          Full Name <span className="text-red-400">*</span>
        </label>

        <input
          id="user-name"
          name="name"
          type="text"
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter full name"
          disabled={loading}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'user-name-error' : undefined}
          className={inputClass('name')}
        />

        {errors.name && (
          <p id="user-name-error" className="mt-1.5 text-xs text-red-300">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="user-email"
          className="block text-sm font-medium text-slate-200"
        >
          Email Address <span className="text-red-400">*</span>
        </label>

        <input
          id="user-email"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="name@company.com"
          // Sign-in uses the Supabase Auth email, which a profile update can't
          // change, so the email is locked after the account is created.
          disabled={loading || isEditing}
          readOnly={isEditing}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'user-email-error' : undefined}
          className={inputClass('email')}
        />

        {errors.email && (
          <p id="user-email-error" className="mt-1.5 text-xs text-red-300">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="user-role"
          className="block text-sm font-medium text-slate-200"
        >
          Role <span className="text-red-400">*</span>
        </label>

        <select
          id="user-role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          disabled={loading}
          aria-invalid={Boolean(errors.role)}
          aria-describedby={errors.role ? 'user-role-error' : undefined}
          className={`${inputClass('role')} cursor-pointer`}
        >
          {allowedRoles.map((role) => (
            <option key={role} value={role} className="bg-slate-900 text-white">
              {role}
            </option>
          ))}
        </select>

        {errors.role && (
          <p id="user-role-error" className="mt-1.5 text-xs text-red-300">
            {errors.role}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="user-department"
          className="block text-sm font-medium text-slate-200"
        >
          Department
        </label>

        <input
          id="user-department"
          name="department"
          type="text"
          value={formData.department}
          onChange={handleChange}
          placeholder="Enter department"
          disabled={loading}
          className={inputClass('department')}
        />
      </div>

      {/* Passwords live in Supabase Auth and can only be set at creation
          (through the create-user Edge Function); profile edits can't change them. */}
      {!isEditing && (
      <div>
        <label
          htmlFor="user-password"
          className="block text-sm font-medium text-slate-200"
        >
          Password <span className="text-red-400">*</span>
        </label>

        <div className="relative mt-1">
          <input
            id="user-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create password"
            disabled={loading}
            minLength={MIN_PASSWORD_LENGTH}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? 'user-password-error' : 'user-password-hint'
            }
            className={`${inputClass('password')} pr-20`}
          />

          <button
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            disabled={loading}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-2 flex min-h-11 items-center justify-center rounded-lg px-3 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {errors.password && (
          <p id="user-password-error" className="mt-1.5 text-xs text-red-300">
            {errors.password}
          </p>
        )}

        <p id="user-password-hint" className="mt-1.5 text-xs text-slate-400">
          Use at least 12 characters for your password.
        </p>
      </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:min-w-24"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:min-w-32"
        >
          {loading ? 'Saving...' : submitText}
        </button>
      </div>
    </form>
  );
}