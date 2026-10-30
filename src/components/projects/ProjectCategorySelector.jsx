const PROJECT_CATEGORIES = [
  {
    value: 'Intern-Based',
    label: 'Intern-Based',
    description: 'Projects designed for interns to gain practical experience and develop their skills.',
    icon: (
      <svg
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 21v-2a8 8 0 0 1 16 0v2M9 13l3 3 3-3"
        />
      </svg>
    ),
  },
  {
    value: 'Main Project',
    label: 'Main Project',
    description: 'Core company projects involving employees and cross-functional teams.',
    icon: (
      <svg
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10h18M8 4v6"
        />
      </svg>
    ),
  },
];

export default function ProjectCategorySelector({
  value = '',
  onChange,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`w-full min-w-0 ${className}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">
          Choose project category
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-300">
          Select the category that best describes this project.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        {PROJECT_CATEGORIES.map((category) => {
          const isSelected = value === category.value;

          return (
            <button
              key={category.value}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onChange?.(category.value)}
              className={`relative flex min-h-44 min-w-0 flex-col items-start rounded-2xl border-2 p-5 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? 'border-indigo-400/40 bg-indigo-500/15'
                  : 'border-slate-700 bg-slate-900 hover:border-indigo-400/40 hover:bg-slate-800'
              }`}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                    isSelected
                      ? 'border-indigo-400/30 bg-indigo-500/20 text-indigo-200'
                      : 'border-slate-700 bg-slate-800 text-slate-300'
                  }`}
                >
                  {category.icon}
                </div>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-500 text-white'
                      : 'border-slate-600 bg-slate-900 text-slate-400'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m5 12 4 4L19 6"
                      />
                    </svg>
                  )}
                </span>
              </div>

              <h4
                className={`mt-4 break-words text-sm font-semibold ${
                  isSelected ? 'text-white' : 'text-slate-100'
                }`}
              >
                {category.label}
              </h4>

              <p className="mt-1 break-words text-sm leading-6 text-slate-300">
                {category.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { PROJECT_CATEGORIES };