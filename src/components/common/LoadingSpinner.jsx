export default function LoadingSpinner({
  size = 'md',
  label = 'Loading...',
  fullScreen = false,
}) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-[3px]',
    lg: 'h-12 w-12 border-4',
  };

  const spinner = (
    <div
      className={`animate-spin rounded-full border-zinc-700 border-t-violet-500 ${sizeClasses[size] || sizeClasses.md}`}
      role="status"
      aria-label={label}
    />
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950">
        {spinner}
        {label && (
          <p className="text-sm text-zinc-400">{label}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      {spinner}
      {label && (
        <span className="text-sm text-zinc-400">{label}</span>
      )}
    </div>
  );
}