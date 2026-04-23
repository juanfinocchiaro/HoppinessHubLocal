import { forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { DotsLoader } from '@/components/ui/loaders';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <Button ref={ref} disabled={disabled || loading} className={cn(className)} {...props}>
        {loading ? (
          <>
            <DotsLoader />
            {loadingText && <span className="ml-2">{loadingText}</span>}
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);

LoadingButton.displayName = 'LoadingButton';
