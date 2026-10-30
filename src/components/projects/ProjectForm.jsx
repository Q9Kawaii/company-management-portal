import { useEffect, useState } from 'react';
import ProjectCategorySelector from './ProjectCategorySelector';
import TeamMemberSelector from './TeamMemberSelector';

const INITIAL_FORM = {
  name: '',
  category: '',
  description: '',
  leadId: '',
  memberIds: [],
};

export default function ProjectForm({
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
  submitText = 'Continue',
  users = [],
  className = '',
}) {
  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
    ...initialValues,
    memberIds: initialValues.memberIds || initialValues.member_ids || [],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      ...INITIAL_FORM,
      ...initialValues,
      memberIds: initialValues.memberIds || initialValues.member_ids || [],
    });
  }, [initialValues]);

  const getUserId = (user) => user.id || user.profileId || '';

  const getUserName = (user) =>
    user.fullName || user.name || 'Unnamed User';

  const availableLeads = users.filter((user) => {
    const isActive = user.isActive ?? user.is_active ?? true;
    return isActive !== false && user.deactivated_at == null;
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Project name is required.';
    } else if (formData.name.trim().length > 120) {
      nextErrors.name = 'Project name must be 120 characters or fewer.';
    }

    if (!formData.category) {
      nextErrors.category = 'Please select a project category.';
    }

    if (!formData.description.trim()) {
      nextErrors.description = 'Project description is required.';
    }

    if (!formData.leadId) {
      nextErrors.leadId = 'Please select a project lead.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    console.log('Project form submitted:', formData);

    if (loading || !validate()) return;

    onSubmit?.({
      name: formData.name.trim(),
      category: formData.category,
      description: formData.description.trim(),
      leadId: formData.leadId,
      memberIds: formData.memberIds,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`min-w-0 space-y-7 ${className}`}
    >
      {/* Project name */}
      <div className="min-w-0">
        <label
          htmlFor="project-name"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          Project name <span className="text-red-400">*</span>
        </label>

        <input
          id="project-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          maxLength={120}
          placeholder="Enter project name"
          disabled={loading}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'project-name-error' : undefined}
          className={`w-full min-w-0 rounded-xl border bg-slate-900 px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-slate-500 sm:text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
            errors.name
              ? 'border-red-400 focus:border-red-400 focus-visible:ring-red-400/30'
              : 'border-slate-700 focus:border-indigo-400 focus-visible:ring-indigo-400/30'
          }`}
        />

        {errors.name && (
          <p
            id="project-name-error"
            className="mt-1.5 text-sm text-red-300"
          >
            {errors.name}
          </p>
        )}
      </div>

      {/* Project category */}
      <div className="min-w-0">
        <ProjectCategorySelector
          value={formData.category}
          onChange={(category) => {
            setFormData((current) => ({ ...current, category }));
            setErrors((current) => ({ ...current, category: '' }));
          }}
          disabled={loading}
        />

        {errors.category && (
          <p className="mt-2 text-sm text-red-300" role="alert">
            {errors.category}
          </p>
        )}
      </div>

      {/* Project description */}
      <div className="min-w-0">
        <label
          htmlFor="project-description"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          Project description <span className="text-red-400">*</span>
        </label>

        <textarea
          id="project-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={5}
          maxLength={3000}
          placeholder="Describe the project goals, scope, and expected outcomes..."
          disabled={loading}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description
              ? 'project-description-error'
              : 'project-description-hint'
          }
          className={`w-full min-w-0 resize-y rounded-xl border bg-slate-900 px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-slate-500 sm:text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
            errors.description
              ? 'border-red-400 focus:border-red-400 focus-visible:ring-red-400/30'
              : 'border-slate-700 focus:border-indigo-400 focus-visible:ring-indigo-400/30'
          }`}
        />

        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
          {errors.description ? (
            <p
              id="project-description-error"
              className="text-sm text-red-300"
            >
              {errors.description}
            </p>
          ) : (
            <p
              id="project-description-hint"
              className="text-xs leading-5 text-slate-400"
            >
              Provide enough detail for the assigned team.
            </p>
          )}

          <span className="shrink-0 text-xs text-slate-400">
            {formData.description.length}/3000
          </span>
        </div>
      </div>

      {/* Project lead */}
      <div className="min-w-0">
        <label
          htmlFor="project-lead"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          Project lead <span className="text-red-400">*</span>
        </label>

        <select
          id="project-lead"
          name="leadId"
          value={formData.leadId}
          onChange={(event) => {
            const leadId = event.target.value;

            setFormData((current) => ({
              ...current,
              leadId,
              memberIds: current.memberIds.filter(
                (id) => String(id) !== String(leadId)
              ),
            }));

            setErrors((current) => ({ ...current, leadId: '' }));
          }}
          disabled={loading}
          aria-invalid={Boolean(errors.leadId)}
          aria-describedby={errors.leadId ? 'project-lead-error' : undefined}
          className={`w-full min-w-0 rounded-xl border bg-slate-900 px-4 py-3 text-base text-white outline-none transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:text-sm ${
            errors.leadId
              ? 'border-red-400 focus:border-red-400 focus-visible:ring-red-400/30'
              : 'border-slate-700 focus:border-indigo-400 focus-visible:ring-indigo-400/30'
          }`}
        >
          <option value="" className="bg-slate-900 text-slate-300">
            Select a project lead
          </option>

          {availableLeads.map((user) => {
            const id = getUserId(user);

            return (
              <option key={id} value={id} className="bg-slate-900 text-white">
                {getUserName(user)} ({id}) — {user.role || 'User'}
              </option>
            );
          })}
        </select>

        {errors.leadId && (
          <p
            id="project-lead-error"
            className="mt-1.5 text-sm text-red-300"
          >
            {errors.leadId}
          </p>
        )}
      </div>

      {/* Team members */}
      <div className="min-w-0 border-t border-slate-700/70 pt-6">
        <TeamMemberSelector
          users={users}
          selectedIds={formData.memberIds}
          onChange={(memberIds) =>
            setFormData((current) => ({ ...current, memberIds }))
          }
          leadId={formData.leadId}
          excludeLead={true}
          allowedRoles={['Employee', 'Intern']}
          disabled={loading}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-700/70 pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
        >
          {loading && (
            <svg
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
              />
            </svg>
          )}

          {loading ? 'Saving...' : submitText}
        </button>
      </div>
    </form>
  );
}