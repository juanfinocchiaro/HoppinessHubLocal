import { ShoppingCart } from 'lucide-react';

interface Props {
  totalItems: number;
  totalPrecio: number;
  onOpen: () => void;
}

export function CartBar({ totalItems, totalPrecio, onOpen }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-safe">
      <button
        onClick={onOpen}
        className="w-full flex items-center justify-between bg-accent text-accent-foreground rounded-2xl px-5 py-4 shadow-elevated hover:bg-accent/90 active:scale-[0.98] transition-all"
        aria-label="Ver carrito"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {totalItems}
            </span>
          </div>
          <span className="font-bold text-sm">Ver carrito</span>
        </div>
        <span className="font-black text-lg">${totalPrecio.toLocaleString('es-AR')}</span>
      </button>
    </div>
  );
}
