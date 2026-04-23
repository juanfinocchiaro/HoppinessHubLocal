import { useState, useEffect, useRef } from 'react';

export function ExpandablePanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(open ? undefined : 0);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        if (ref.current) setHeight(ref.current.scrollHeight);
      });
    } else {
      if (ref.current) setHeight(ref.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open]);

  const onTransitionEnd = () => {
    if (open) setHeight(undefined);
    else setIsVisible(false);
  };

  if (!isVisible && !open) return null;

  return (
    <div
      style={{
        height: height !== undefined ? `${height}px` : 'auto',
        overflow: 'hidden',
        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
        opacity: open ? 1 : 0,
      }}
      onTransitionEnd={onTransitionEnd}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}
