/**
 * AuthLayout — Minimal layout for authentication pages (forgot password, reset password).
 * Logo centered at top, content centered, no full navigation.
 */
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="shrink-0 border-b">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-warning" />
        <div className="flex items-center justify-center h-14">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoHoppiness}
              alt="Hoppiness"
              className="w-8 h-8 rounded-full object-contain"
            />
            <span className="text-sm font-bold font-brand">HOPPINESS CLUB</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
