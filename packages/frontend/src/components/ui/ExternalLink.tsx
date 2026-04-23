import { Link } from 'react-router-dom';
import { useEmbedMode } from '@/hooks/useEmbedMode';

interface ExternalLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Link que navega la ventana principal si está en iframe,
 * o usa react-router si no está embebido.
 */
export const ExternalLink = ({ to, children, className, onClick }: ExternalLinkProps) => {
  const { isEmbedded } = useEmbedMode();

  if (isEmbedded) {
    return (
      <a href={to} target="_top" className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className} onClick={onClick}>
      {children}
    </Link>
  );
};
