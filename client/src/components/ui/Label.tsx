import { LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5', className)}
      {...props}
    >
      {children}
      {required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
    </label>
  )
);

Label.displayName = 'Label';