import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchesMap } from '@/services/adminService';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageSquare,
  Download,
  Phone,
  Check,
  Archive,
  Building2,
  Briefcase,
  Package,
  ShoppingBag,
  HelpCircle,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useContactMessages,
  useMessageCounts,
  type MessageType,
  type ContactMessage,
} from '@/hooks/useContactMessages';
import { toast } from 'sonner';

const typeConfig: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
  franquicia: { icon: Building2, label: 'Franquicia', color: 'bg-purple-500' },
  empleo: { icon: Briefcase, label: 'Empleo', color: 'bg-green-500' },
  proveedor: { icon: Package, label: 'Proveedor', color: 'bg-orange-500' },
  pedidos: { icon: ShoppingBag, label: 'Pedido', color: 'bg-red-500' },
  consulta: { icon: HelpCircle, label: 'Consulta', color: 'bg-blue-500' },
  otro: { icon: MessageSquare, label: 'Otro', color: 'bg-gray-500' },
};

function MessageCard({
  message,
  onMarkRead,
  onArchive,
  branches,
  resolveTemplate,
}: {
  message: ContactMessage;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  branches: Record<string, string>;
  resolveTemplate: (
    subjectType: string,
    contact: { name: string; email: string; phone: string },
  ) => string;
}) {
  const isUnread = !message.read_at;
  const config = typeConfig[message.subject] || typeConfig.otro;
  const TypeIcon = config.icon;

  const handleWhatsApp = () => {
    const cleanPhone = message.phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('54') ? cleanPhone : `54${cleanPhone}`;
    const text = resolveTemplate(message.subject, {
      name: message.name,
      email: message.email,
      phone: message.phone,
    });
    const url = text
      ? `whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(text)}`
      : `whatsapp://send?phone=${fullPhone}`;
    window.open(url, '_self');
  };

  const handleMarkRead = () => {
    onMarkRead(message.id);
    toast.success('Mensaje marcado como leído');
  };

  const handleArchive = () => {
    onArchive(message.id);
    toast.success('Mensaje archivado');
  };

  const renderSpecificFields = () => {
    switch (message.subject) {
      case 'franquicia':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
              {message.franchise_has_zone && (
                <div>
                  <span className="font-medium">Zona:</span> {message.franchise_has_zone}
                </div>
              )}
              {message.franchise_has_location && (
                <div>
                  <span className="font-medium">Local:</span> {message.franchise_has_location}
                </div>
              )}
              {message.franchise_investment_capital && (
                <div>
                  <span className="font-medium">Capital:</span>{' '}
                  {message.franchise_investment_capital}
                </div>
              )}
              {message.investment_range && (
                <div>
                  <span className="font-medium">Rango inversión:</span> {message.investment_range}
                </div>
              )}
            </div>
            {message.message && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
                {message.message}
              </p>
            )}
          </div>
        );
      case 'empleo':
        return (
          <div className="space-y-1 text-sm text-muted-foreground">
            {message.employment_branch_id && branches[message.employment_branch_id] && (
              <div>
                <span className="font-medium">Sucursal:</span>{' '}
                {branches[message.employment_branch_id]}
              </div>
            )}
            {message.employment_position && (
              <div>
                <span className="font-medium">Puesto:</span> {message.employment_position}
              </div>
            )}
            {message.employment_motivation && (
              <div>
                <span className="font-medium">Motivación:</span> {message.employment_motivation}
              </div>
            )}
            {(message.employment_cv_link || message.attachment_url) && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {message.attachment_url ? (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {message.attachment_name || 'CV Adjunto'}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  message.employment_cv_link && (
                    <a
                      href={message.employment_cv_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Ver CV/LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )
                )}
              </div>
            )}
          </div>
        );
      case 'pedidos':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
            {message.order_number && (
              <div>
                <span className="font-medium">Nro Pedido:</span> #{message.order_number}
              </div>
            )}
            {message.order_date && (
              <div>
                <span className="font-medium">Fecha:</span> {message.order_date}
              </div>
            )}
            {message.order_issue && (
              <div className="md:col-span-3">
                <span className="font-medium">Problema:</span> {message.order_issue}
              </div>
            )}
          </div>
        );
      default:
        return (
          message.message && <p className="text-sm text-muted-foreground">{message.message}</p>
        );
    }
  };

  return (
    <Card
      className={`transition-all ${isUnread ? 'border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/10' : ''}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge className={isUnread ? 'bg-orange-500' : 'bg-muted text-muted-foreground'}>
              {isUnread ? 'NUEVO' : 'LEÍDO'}
            </Badge>
            <div>
              <h3 className="font-semibold">{message.name}</h3>
              <p className="text-sm text-muted-foreground">{message.email}</p>
              <p className="text-sm text-muted-foreground">{message.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="flex items-center gap-1">
              <TypeIcon className="h-3 w-3" />
              {config.label}
            </Badge>
            <span>
              {message.created_at &&
                formatDistanceToNow(new Date(message.created_at), {
                  addSuffix: true,
                  locale: es,
                })}
            </span>
          </div>
        </div>

        {/* Specific fields based on type */}
        {renderSpecificFields()}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsApp}
            className="flex items-center gap-1"
          >
            <Phone className="h-4 w-4" />
            WhatsApp
          </Button>
          {isUnread && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkRead}
              className="flex items-center gap-1"
            >
              <Check className="h-4 w-4" />
              Marcar leído
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleArchive}
            className="flex items-center gap-1 text-muted-foreground"
          >
            <Archive className="h-4 w-4" />
            Archivar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { RequireBrandPermission } from '@/components/guards';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { WhatsAppTemplatesDialog } from '@/components/admin/WhatsAppTemplatesDialog';

function ContactMessagesPageContent() {
  const [typeFilter, setTypeFilter] = useState<MessageType>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  const { messages, isLoading, markAsRead, archive } = useContactMessages({
    typeFilter,
    showOnlyUnread,
  });

  const { data: counts } = useMessageCounts();
  const { resolveTemplate } = useWhatsAppTemplates();

  // Fetch branches for resolving employment_branch_id
  const { data: branchesMap } = useQuery({
    queryKey: ['branches-map'],
    queryFn: fetchBranchesMap,
  });

  const handleExportCSV = () => {
    if (!messages.length) {
      toast.error('No hay mensajes para exportar');
      return;
    }

    const headers = ['Fecha', 'Nombre', 'Email', 'Teléfono', 'Tipo', 'Estado', 'Mensaje'];
    const rows = messages.map((msg) => [
      msg.created_at ? new Date(msg.created_at).toLocaleDateString('es-AR') : '',
      msg.name,
      msg.email,
      msg.phone,
      msg.subject,
      msg.read_at ? 'Leído' : 'Nuevo',
      msg.message || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mensajes-contacto-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado correctamente');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Mensajes de contacto</h1>
        </div>
        <div className="flex items-center gap-2">
          <WhatsAppTemplatesDialog />
          <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as MessageType)}>
          <TabsList>
            <TabsTrigger value="all">Todos ({counts?.all ?? 0})</TabsTrigger>
            <TabsTrigger value="franquicia">Franquicias ({counts?.franquicia ?? 0})</TabsTrigger>
            <TabsTrigger value="empleo">Empleo ({counts?.empleo ?? 0})</TabsTrigger>
            <TabsTrigger value="proveedor">Proveedores ({counts?.proveedor ?? 0})</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos ({counts?.pedidos ?? 0})</TabsTrigger>
            <TabsTrigger value="consulta">Consultas ({counts?.consulta ?? 0})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Checkbox
            id="unread-only"
            checked={showOnlyUnread}
            onCheckedChange={(checked) => setShowOnlyUnread(checked === true)}
          />
          <label htmlFor="unread-only" className="text-sm cursor-pointer">
            Solo no leídos
          </label>
        </div>
      </div>

      {/* Messages list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-48" />
              </CardContent>
            </Card>
          ))
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay mensajes {showOnlyUnread ? 'sin leer' : ''}</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onMarkRead={markAsRead}
              onArchive={archive}
              branches={branchesMap ?? {}}
              resolveTemplate={resolveTemplate}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function ContactMessagesPage() {
  return (
    <RequireBrandPermission
      permission="canManageMessages"
      noAccessMessage="No tenés permisos para gestionar mensajes de contacto."
    >
      <ContactMessagesPageContent />
    </RequireBrandPermission>
  );
}
