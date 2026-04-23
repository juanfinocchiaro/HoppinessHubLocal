import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (import.meta.env.DEV) console.warn('404: Ruta no encontrada:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero px-4">
      <div className="flex flex-col items-center text-center max-w-md space-y-6">
        <img
          src="/hoppiness-logo.webp"
          alt="Hoppiness"
          className="h-16 w-auto opacity-90"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="space-y-2">
          <h1 className="text-7xl font-black font-display text-white/90">404</h1>
          <p className="text-xl font-brand text-white/80">Esta hamburguesa no existe... todavía</p>
          <p className="text-sm text-white/50">La página que buscás no se encontró o fue movida.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="border-white/20 text-white bg-white/5 hover:bg-white/15"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button className="bg-white text-primary hover:bg-white/90" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
