import type { ReactNode } from 'react';
import { PageHeader } from '@/components/ui/page-header';

interface CuentaSectionPageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function CuentaSectionPage({ title, subtitle, children }: CuentaSectionPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}
