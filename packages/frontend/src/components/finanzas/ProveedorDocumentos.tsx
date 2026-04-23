import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useProveedorDocumentos,
  useUploadProveedorDoc,
  useDeleteProveedorDoc,
} from '@/hooks/useProveedorDocumentos';

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProveedorDocumentos({ proveedorId }: { proveedorId: string }) {
  const { data: docs, isLoading } = useProveedorDocumentos(proveedorId);
  const upload = useUploadProveedorDoc();
  const deleteMut = useDeleteProveedorDoc();
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate({ proveedorId, file });
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Documentos</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <FileUp className="w-4 h-4 mr-1.5" />
          )}
          {upload.isPending ? 'Subiendo...' : 'Subir PDF'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !docs?.length ? (
        <p className="text-sm text-muted-foreground">Sin documentos adjuntos</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30"
            >
              <FileText className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.nombre_archivo}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(doc.file_size_bytes)}
                  {' · '}
                  {new Date(doc.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={doc.public_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setDeletingId(doc.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={() => setDeletingId(null)}
        title="Eliminar documento"
        description="¿Eliminar este documento? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deletingId) {
            await deleteMut.mutateAsync({ docId: deletingId, proveedorId });
            setDeletingId(null);
          }
        }}
      />
    </div>
  );
}
