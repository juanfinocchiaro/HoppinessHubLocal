import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

export function MobileOrderFAB() {
  return (
    <Link
      to="/pedir"
      className="fixed bottom-6 right-6 z-50 md:hidden bg-accent hover:bg-accent/90 text-accent-foreground rounded-full p-4 shadow-elevated transition-transform active:scale-95"
      aria-label="Pedí Online"
    >
      <ShoppingBag className="w-6 h-6" />
    </Link>
  );
}
