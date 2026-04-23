import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-foreground text-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <img src={logoHoppiness} alt="Hoppiness Club" className="w-16 h-16 mb-4" />
            <p className="text-background/70 text-sm">
              Club de hamburguesas 100% cordobés. Culto al sabor desde 2018.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 font-brand">ENLACES</h4>
            <div className="space-y-2 text-sm">
              <Link to="/pedir" className="block text-background/70 hover:text-background">
                Pedí Online
              </Link>
              <Link to="/nosotros" className="block text-background/70 hover:text-background">
                Nosotros
              </Link>
              <Link to="/franquicias" className="block text-background/70 hover:text-background">
                Franquicias
              </Link>
              <a href="/#clubes" className="block text-background/70 hover:text-background">
                Nuestros Clubes
              </a>
              <Link to="/contacto" className="block text-background/70 hover:text-background">
                Contacto
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 font-brand">SUMATE</h4>
            <div className="space-y-2 text-sm">
              <Link to="/franquicias" className="block text-background/70 hover:text-background">
                Abrí tu Franquicia
              </Link>
              <Link
                to="/contacto?asunto=empleo"
                className="block text-background/70 hover:text-background"
              >
                Trabajá con nosotros
              </Link>
              <Link
                to="/contacto?asunto=proveedor"
                className="block text-background/70 hover:text-background"
              >
                Proveedores
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 font-brand">SEGUINOS</h4>
            <div className="space-y-3">
              <a
                href="https://instagram.com/hoppinessclub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-background/70 hover:text-background text-sm"
              >
                <Instagram className="w-5 h-5" />
                @hoppinessclub
              </a>
              <a
                href="https://tiktok.com/@hoppinessclub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-background/70 hover:text-background text-sm"
              >
                <TikTokIcon className="w-5 h-5" />
                @hoppinessclub
              </a>
              <a
                href="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-background/70 hover:text-background text-sm"
              >
                <SpotifyIcon className="w-5 h-5" />
                Nuestra Playlist
              </a>
            </div>
            <p className="text-background/50 text-sm mt-4">50.000+ seguidores</p>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-background/50 text-sm">
          <p>© {new Date().getFullYear()} Hoppiness Club. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
