import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps {
  label?: string;
  description?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, label, description, id, checked = false, onChange, disabled, ...props }, ref) => {
    const switchId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-center gap-3">
        <button
          role="switch"
          type="button"
          ref={ref}
          id={switchId}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700',
            className
          )}
          aria-checked={checked}
          disabled={disabled}
          onClick={() => {
            if (!disabled && onChange) {
              onChange(!checked);
            }
          }}
          {...props}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
            aria-hidden="true"
          />
        </button>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label htmlFor={switchId} className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                {label}
              </label>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';