import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, Eye } from 'lucide-react';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const typeLabels: Record<string, string> = {
  franquicia: 'Franquicia',
  empleo: 'Empleo',
  proveedor: 'Proveedor',
  pedidos: 'Pedidos',
  consulta: 'Consulta',
  otro: 'Otro',
};

const EXAMPLE_CONTACT = { name: 'Juan Pérez', email: 'juan@ejemplo.com', phone: '3515551234' };

export function WhatsAppTemplatesDialog() {
  const { templates, isLoading, updateTemplate, isUpdating } = useWhatsAppTemplates();
  const [open, setOpen] = useState(false);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('franquicia');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (templates.length > 0 && Object.keys(editedTexts).length === 0) {
      const map: Record<string, string> = {};
      templates.forEach((t) => {
        map[t.id] = t.template_text;
      });
      setEditedTexts(map);
    }
  }, [templates]);

  const handleSave = (id: string) => {
    const text = editedTexts[id];
    if (text !== undefined) {
      updateTemplate({ id, template_text: text });
    }
  };

  const resolvePreview = (text: string) =>
    text
      .replace(/\[NOMBRE\]/g, EXAMPLE_CONTACT.name)
      .replace(/\[EMAIL\]/g, EXAMPLE_CONTACT.email)
      .replace(/\[TELEFONO\]/g, EXAMPLE_CONTACT.phone);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Plantillas WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plantillas de mensajes de WhatsApp</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-2">
          Variables disponibles: <Badge variant="outline">[NOMBRE]</Badge>{' '}
          <Badge variant="outline">[EMAIL]</Badge> <Badge variant="outline">[TELEFONO]</Badge>
        </p>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-9 w-full rounded bg-muted animate-pulse" />
            <div className="h-32 w-full rounded bg-muted animate-pulse" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto">
              {Object.entries(typeLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(typeLabels).map((key) => {
              const tpl = templates.find((t) => t.subject_type === key);
              if (!tpl) return null;
              const text = editedTexts[tpl.id] ?? tpl.template_text;
              const changed =
                editedTexts[tpl.id] !== undefined && editedTexts[tpl.id] !== tpl.template_text;

              return (
                <TabsContent key={key} value={key} className="space-y-3">
                  {showPreview ? (
                    <div className="bg-muted rounded-lg p-4 whitespace-pre-wrap text-sm">
                      {resolvePreview(text)}
                    </div>
                  ) : (
                    <Textarea
                      value={text}
                      onChange={(e) =>
                        setEditedTexts((prev) => ({ ...prev, [tpl.id]: e.target.value }))
                      }
                      rows={10}
                      className="font-mono text-sm"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {showPreview ? 'Editar' : 'Preview'}
                    </Button>
                    {changed && (
                      <Button size="sm" onClick={() => handleSave(tpl.id)} disabled={isUpdating}>
                        <Save className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
