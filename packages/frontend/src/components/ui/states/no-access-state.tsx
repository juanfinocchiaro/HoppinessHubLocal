import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NoAccessStateProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  backLabel?: string;
  backPath?: string;
  className?: string;
}

/**
 * Estado de acceso denegado.
 * Muestra cuando el usuario no tiene permisos para ver una sección.
 */
export function NoAccessState({
  title = 'Sin acceso',
  description = 'No tenés permisos para acceder a esta sección.',
  showBackButton = true,
  backLabel = 'Volver',
  backPath,
  className,
}: NoAccessStateProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center min-h-[400px]',
        className,
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {showBackButton && (
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>
      )}
    </div>
  );
}
