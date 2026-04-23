import { useState, useRef, useEffect } from 'react';

interface EditableQtyProps {
  quantity: number;
  onSetQty: (qty: number) => void;
}

export function EditableQty({ quantity, onSetQty }: EditableQtyProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(quantity));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(quantity));
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, quantity]);

  const confirm = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      onSetQty(parsed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={confirm}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="h-8 w-12 text-center text-sm font-medium rounded-md border border-input bg-background [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-sm font-medium w-8 h-8 text-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-text flex items-center justify-center"
      title="Click para editar cantidad"
    >
      {quantity}
    </button>
  );
}
