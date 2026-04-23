/**
 * AppHeader — Universal header for the entire Hoppiness Hub platform.
 *
 * Three modes:
 * - "public": Institutional nav (Nuestros Clubes, Nosotros, etc.) + CTA "Pedí Online"
 * - "store": Contextual title + search + cart (used in /pedir, /pedir/:slug)
 * - "work": Sidebar toggle (mobile) + breadcrumb (used in /cuenta, /milocal, /mimarca)
 *
 * Consistent across all modes: Logo (32x32, links to /), Avatar (right), h-14, z-50,
 * gradient accent line (from-primary via-accent to-warning).
 */
import { type ReactNode, useState } from 'react';
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Menu as MenuIcon,
  Phone,
  Users2,
  Store as StoreIcon,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserMenuDropdown } from '@/components/webapp/UserMenuDropdown';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

// ----- Public mode nav items (desktop horizontal + mobile drawer) -----

const publicNavItems = [
  { to: '/#clubes', label: 'Nuestros Clubes', icon: StoreIcon, anchor: true },
  { to: '/nosotros', label: 'Nosotros', icon: Users2 },
  { to: '/franquicias', label: 'Franquicias', icon: StoreIcon },
  { to: '/contacto', label: 'Contacto', icon: Phone },
];

// ----- Props -----

interface AppHeaderBaseProps {
  variant?: 'default' | 'transparent';
  scrolled?: boolean;
  children?: ReactNode;
}

interface PublicModeProps extends AppHeaderBaseProps {
  mode: 'public';
  title?: string;
}

interface StoreModeProps extends AppHeaderBaseProps {
  mode: 'store';
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showSearch?: boolean;
  onSearchToggle?: () => void;
  showCart?: boolean;
  cartCount?: number;
  onCartClick?: () => void;
  extraActions?: ReactNode;
}

interface WorkModeProps extends AppHeaderBaseProps {
  mode: 'work';
  breadcrumb?: string;
  onToggleSidebar?: () => void;
}

export type AppHeaderProps = PublicModeProps | StoreModeProps | WorkModeProps;

export function AppHeader(props: AppHeaderProps) {
  const { mode, variant = 'default', scrolled = false, children } = props;
  const isTransparent = variant === 'transparent' && !scrolled;

  return (
    <header
      className={`${variant === 'transparent' ? 'fixed' : 'sticky'} top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isTransparent ? 'bg-transparent border-b-0 shadow-none' : 'bg-background border-b shadow-sm'
      }`}
    >
      {!isTransparent && (
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-warning" />
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center h-14 px-4 gap-3">
          {mode === 'public' && (
            <PublicCenter isTransparent={isTransparent} title={(props as PublicModeProps).title} />
          )}
          {mode === 'store' && (
            <StoreCenter isTransparent={isTransparent} {...(props as StoreModeProps)} />
          )}
          {mode === 'work' && <WorkCenter {...(props as WorkModeProps)} />}

          {/* Right zone — always the same */}
          <div className="flex items-center gap-1 shrink-0">
            {mode === 'store' && (
              <StoreActions isTransparent={isTransparent} {...(props as StoreModeProps)} />
            )}
            {mode === 'public' && <PublicCTA isTransparent={isTransparent} />}
            <UserMenuDropdown />
            {mode === 'public' && <PublicMobileMenu />}
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

// ======================== PUBLIC MODE ========================

function PublicCenter({ isTransparent, title }: { isTransparent: boolean; title?: string }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <Link to="/" className="shrink-0 flex items-center gap-2">
        <img
          src={logoHoppiness}
          alt="Hoppiness"
          className={`w-8 h-8 rounded-full object-contain ${isTransparent ? 'drop-shadow-lg' : ''}`}
        />
        <span
          className={`text-sm font-bold font-brand hidden sm:inline ${isTransparent ? 'text-white' : 'text-foreground'}`}
        >
          {title || 'HOPPINESS CLUB'}
        </span>
      </Link>

      {/* Desktop nav — active = Nuestros Clubes on home, or path matches route */}
      <nav className="hidden md:flex items-center gap-0.5 ml-4">
        {publicNavItems.map((item) => {
          const active = item.anchor ? isHome : location.pathname.startsWith(item.to);
          const activeStyles = active
            ? isTransparent
              ? 'text-white font-semibold border-b-2 border-white/90 rounded-none pb-0.5'
              : 'text-foreground font-semibold border-b-2 border-accent rounded-none pb-0.5 bg-muted/50'
            : '';
          const baseStyles = isTransparent
            ? 'text-white/80 hover:bg-white/10 hover:text-white'
            : 'hover:bg-muted text-muted-foreground';
          if (item.anchor) {
            return (
              <Link
                key={item.to}
                to={isHome ? '#clubes' : '/#clubes'}
                onClick={(e) => {
                  if (isHome) {
                    e.preventDefault();
                    document.getElementById('clubes')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <Button variant="ghost" size="sm" className={`${baseStyles} ${activeStyles}`}>
                  {item.label}
                </Button>
              </Link>
            );
          }
          return (
            <Link key={item.to} to={item.to}>
              <Button variant="ghost" size="sm" className={`${baseStyles} ${activeStyles}`}>
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function PublicCTA({ isTransparent }: { isTransparent: boolean }) {
  return (
    <Link to="/pedir" className="hidden md:block">
      <Button
        size="sm"
        className={
          isTransparent
            ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
            : 'bg-accent hover:bg-accent/90 text-accent-foreground'
        }
      >
        <ShoppingBag className="w-4 h-4 mr-1" />
        Pedí Online
      </Button>
    </Link>
  );
}

function PublicMobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
            <MenuIcon className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72">
          <nav className="flex flex-col gap-1 mt-6">
            <Link to="/pedir" onClick={() => setOpen(false)}>
              <Button className="w-full justify-start bg-accent hover:bg-accent/90 text-accent-foreground mb-2">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Pedí Online
              </Button>
            </Link>
            <Link
              to={isHome ? '#clubes' : '/#clubes'}
              onClick={(e) => {
                setOpen(false);
                if (isHome) {
                  e.preventDefault();
                  document.getElementById('clubes')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <Button
                variant="ghost"
                className={`w-full justify-start ${isHome ? 'bg-accent/15 text-accent-foreground font-semibold border-l-2 border-accent' : ''}`}
              >
                <StoreIcon className="w-4 h-4 mr-2" />
                Nuestros Clubes
              </Button>
            </Link>
            {publicNavItems
              .filter((i) => !i.anchor)
              .map((item) => {
                const active = location.pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${active ? 'bg-accent/15 text-accent-foreground font-semibold border-l-2 border-accent' : ''}`}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ======================== STORE MODE ========================

function StoreCenter({
  isTransparent,
  title,
  subtitle,
  showBack,
  onBack,
}: StoreModeProps & { isTransparent: boolean }) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      {showBack && (
        <button
          onClick={handleBack}
          className={`p-1.5 -ml-1 rounded-lg transition-colors shrink-0 ${
            isTransparent
              ? 'text-white/80 hover:bg-white/10'
              : 'hover:bg-muted text-muted-foreground'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      <Link to="/" className="shrink-0">
        <img
          src={logoHoppiness}
          alt="Hoppiness"
          className={`w-8 h-8 rounded-full object-contain ${isTransparent ? 'drop-shadow-lg' : ''}`}
        />
      </Link>

      <div className="min-w-0">
        <h1
          className={`font-brand text-sm font-bold truncate leading-tight ${isTransparent ? 'text-white' : 'text-foreground'}`}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={`text-[11px] truncate leading-tight ${isTransparent ? 'text-white/70' : 'text-muted-foreground'}`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function StoreActions({
  isTransparent,
  showSearch,
  onSearchToggle,
  showCart,
  onCartClick,
  cartCount = 0,
  extraActions,
}: StoreModeProps & { isTransparent: boolean }) {
  return (
    <>
      {showSearch && (
        <button
          onClick={onSearchToggle}
          className={`p-1.5 rounded-lg transition-colors ${
            isTransparent
              ? 'text-white/80 hover:bg-white/10'
              : 'hover:bg-muted text-muted-foreground'
          }`}
        >
          <Search className="w-5 h-5" />
        </button>
      )}
      {showCart && (
        <button
          onClick={onCartClick}
          className={`p-1.5 rounded-lg transition-colors relative ${
            isTransparent
              ? 'text-white/80 hover:bg-white/10'
              : 'hover:bg-muted text-muted-foreground'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[9px] font-black rounded-full h-4 min-w-[16px] flex items-center justify-center px-0.5">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      )}
      {extraActions}
    </>
  );
}

// ======================== WORK MODE ========================

function WorkCenter({ breadcrumb, onToggleSidebar }: WorkModeProps) {
  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 rounded-lg transition-colors shrink-0 hover:bg-muted text-muted-foreground lg:hidden"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
      )}

      <Link to="/" className="shrink-0">
        <img src={logoHoppiness} alt="Hoppiness" className="w-8 h-8 rounded-full object-contain" />
      </Link>

      {breadcrumb && (
        <span className="text-sm font-semibold text-foreground truncate">{breadcrumb}</span>
      )}
    </div>
  );
}
