/**
 * WebappHeader — Backward-compatible wrapper around AppHeader (store mode).
 * New code should use AppHeader directly.
 */
import { type ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';

interface WebappHeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearchToggle?: () => void;
  showCart?: boolean;
  cartCount?: number;
  onCartClick?: () => void;
  extraActions?: ReactNode;
  children?: ReactNode;
  variant?: 'default' | 'transparent';
  scrolled?: boolean;
}

export function WebappHeader(props: WebappHeaderProps) {
  return (
    <AppHeader
      mode="store"
      title={props.title}
      subtitle={props.subtitle}
      showBack={props.showBack}
      onBack={props.onBack}
      showSearch={props.showSearch}
      onSearchToggle={props.onSearchToggle}
      showCart={props.showCart}
      cartCount={props.cartCount}
      onCartClick={props.onCartClick}
      extraActions={props.extraActions}
      variant={props.variant}
      scrolled={props.scrolled}
    >
      {props.children}
    </AppHeader>
  );
}
