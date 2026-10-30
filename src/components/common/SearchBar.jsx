import { useState } from 'react';

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search by name or user ID...',
  className = '',
  autoFocus = false,
  disabled = false,
}) {
  const [internalValue, setInternalValue] = useState('');

  const isControlled = value !== undefined;
  const searchValue = isControlled ? value : internalValue;

  const handleChange = (event) => {
    const nextValue = event.target.value;

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch?.(searchValue.trim());
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('');
    }

    onChange?.('');
    onSearch?.('');
  };

  return (
    <div
      role="search"
      className={`w-full ${className}`}
    >
      <div className="relative flex items-center">
        <svg
          className="pointer-events-none absolute left-3.5 h-5 w-5 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-4.34-4.34m1.59-5.16a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z"
          />
        </svg>

        <input
          type="search"
          value={searchValue}
          onChange={handleChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-12 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        />

        {searchValue && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear search"
            className="absolute right-3 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M18 6 6 18"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}