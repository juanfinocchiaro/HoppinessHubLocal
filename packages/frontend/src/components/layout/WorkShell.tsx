/**
 * WorkShell — Unified layout for work panels (Mi Marca / Mi Local / Mi Cuenta).
 *
 * Uses AppHeader (mode="work") as the universal header.
 * Sidebar has a fixed structure: context slot (min-height) + nav area (min-height)
 * so layout stays stable when switching between panels.
 * Sidebar is sticky on desktop, Sheet drawer on mobile (triggered from AppHeader hamburger).
 * Body scroll is natural (no viewport trap).
 */
import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { useWorkBreadcrumb } from '@/hooks/useWorkBreadcrumb';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import { OfflineBanner } from '@/components/ui/offline-banner';
import logoHoppinessBlue from '@/assets/logo-hoppiness-blue.png';

const SIDEBAR_CONTEXT_MIN_H = 'min-h-[52px]';
const SIDEBAR_NAV_MIN_H = 'min-h-[200px]';

interface WorkShellProps {
  mode: 'brand' | 'local' | 'cuenta';
  title: string;
  mobileTitle?: string;
  /** Optional top slot (e.g. branch selector in Mi Local). Always reserves space for stable layout. */
  sidebarContext?: ReactNode;
  /** Main navigation list. Rendered in a scrollable area with min-height. */
  sidebarNav: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WorkShell({
  title,
  sidebarContext,
  sidebarNav,
  footer,
  children,
  className,
}: WorkShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const breadcrumb = useWorkBreadcrumb(title);

  const sidebarBody = (
    <>
      {/* Context slot — fixed min-height for stable layout across panels */}
      <div className={cn('shrink-0 px-5 pt-5 pb-0', SIDEBAR_CONTEXT_MIN_H)}>
        {sidebarContext ?? null}
      </div>
      {/* Nav area — min-height avoids layout jump when switching to panels with fewer items */}
      <div className={cn('flex-1 overflow-y-auto px-5 pt-4 pb-5', SIDEBAR_NAV_MIN_H)}>
        {sidebarNav}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineBanner />
      <ImpersonationBanner />

      {/* Universal header */}
      <AppHeader mode="work" breadcrumb={breadcrumb} onToggleSidebar={() => setSidebarOpen(true)} />

      {/* Mobile sidebar drawer — same structure for consistency */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-4 flex flex-col">
          <div className="mb-4 flex items-center">
            <img
              src={logoHoppinessBlue}
              alt="Hoppiness"
              className="w-14 h-14 rounded-xl object-contain bg-white p-1"
            />
          </div>
          <div className={cn('flex-1 overflow-y-auto flex flex-col', SIDEBAR_CONTEXT_MIN_H)}>
            <div className={cn('shrink-0', SIDEBAR_CONTEXT_MIN_H)}>{sidebarContext ?? null}</div>
            <div className={cn('flex-1 pt-2', SIDEBAR_NAV_MIN_H)}>{sidebarNav}</div>
          </div>
          {footer && <div className="pt-4 border-t space-y-3">{footer}</div>}
        </SheetContent>
      </Sheet>

      {/* Main layout: sidebar (desktop) + content */}
      <div className="flex flex-1">
        <aside
          className={cn(
            'hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 bg-card border-r',
            'sticky top-[calc(56px+4px)] h-[calc(100vh-56px-4px)] overflow-hidden',
          )}
        >
          {sidebarBody}
          {footer && <div className="p-4 border-t space-y-4 shrink-0">{footer}</div>}
        </aside>

        <main className={cn('flex-1 min-w-0', className)}>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default WorkShell;
