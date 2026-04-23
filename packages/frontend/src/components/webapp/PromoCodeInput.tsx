import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, X, Loader2, Check } from 'lucide-react';
import { useValidateCode, type CodigoDescuento } from '@/hooks/useCodigosDescuento';

interface PromoCodeInputProps {
  branchId: string | undefined;
  subtotal: number;
  onApply: (descuento: number, codigoId: string, codigoText: string) => void;
  onRemove: () => void;
  appliedCode: string | null;
  appliedDiscount: number;
}

export function PromoCodeInput({
  branchId,
  subtotal,
  onApply,
  onRemove,
  appliedCode,
  appliedDiscount,
}: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const validate = useValidateCode(branchId);
  const appliedCodeRef = useRef<CodigoDescuento | null>(null);

  useEffect(() => {
    if (!appliedCodeRef.current || !appliedCode) return;
    const c = appliedCodeRef.current;
    if (c.min_order_amount && subtotal < c.min_order_amount) {
      appliedCodeRef.current = null;
      onRemove();
    }
  }, [subtotal, appliedCode, onRemove]);

  const handleApply = () => {
    if (!code.trim()) return;
    validate.mutate(
      { codigo: code.trim(), subtotal },
      {
        onSuccess: (result) => {
          appliedCodeRef.current = result.code;
          onApply(result.descuento, result.code.id, result.code.code);
          setCode('');
        },
      },
    );
  };

  const handleRemove = () => {
    appliedCodeRef.current = null;
    onRemove();
  };

  if (appliedCode) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-2.5">
        <Check className="w-4 h-4 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-green-800">
            {appliedCode} — ${appliedDiscount.toLocaleString('es-AR')} off
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600"
          onClick={handleRemove}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5" />
        Código de descuento
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="BIENVENIDO20"
          className="h-8 text-xs font-mono flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleApply();
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleApply}
          disabled={validate.isPending || !code.trim()}
          className="h-8 text-xs"
        >
          {validate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Aplicar'}
        </Button>
      </div>
      {validate.isError && (
        <p className="text-xs text-destructive">{(validate.error as Error).message}</p>
      )}
    </div>
  );
}
