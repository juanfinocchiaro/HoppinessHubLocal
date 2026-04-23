import { cn } from '@/lib/utils';
import { SpinnerLoader } from '@/components/ui/loaders';

interface HoppinessLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export function HoppinessLoader({
  size = 'md',
  text = 'Cargando',
  fullScreen = false,
  className,
}: HoppinessLoaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullScreen && 'min-h-screen bg-background',
        className,
      )}
    >
      <SpinnerLoader size={size} text={size === 'sm' ? undefined : text} />
    </div>
  );
}

export default HoppinessLoader;
