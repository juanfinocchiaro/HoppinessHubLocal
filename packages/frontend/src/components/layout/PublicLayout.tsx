/**
 * PublicLayout — Shared layout for public site pages (/, /nosotros, /franquicias, /contacto).
 * Renders a single transparent header and scroll-based background, with smooth page transitions.
 */
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';

const SCROLL_THRESHOLD = 80;

export function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    handleScroll(); // initial
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on route change; scroll to #clubes when landing on /#clubes
  useEffect(() => {
    const { pathname, hash } = location;
    window.scrollTo(0, 0);
    if (pathname === '/' && hash === '#clubes') {
      const id = setTimeout(() => {
        document.getElementById('clubes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(id);
    }
  }, [location.pathname, location.hash]);

  return (
    <>
      <AppHeader mode="public" variant="transparent" scrolled={scrolled} />
      <main className="min-h-screen">
        <div
          key={location.pathname}
          className="animate-in fade-in slide-in-from-right-4 duration-300"
        >
          <Outlet />
        </div>
      </main>
    </>
  );
}
