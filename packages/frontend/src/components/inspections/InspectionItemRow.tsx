/**
 * InspectionItemRow - Fila individual del checklist de inspección
 * Soporta múltiples fotos por hallazgo (photo_urls array)
 */

import { useState } from 'react';
import { Camera, Check, X, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { InspectionItem } from '@/types/inspection';
import { useUpdateInspectionItem, useUploadInspectionPhoto } from '@/hooks/useInspections';

interface InspectionItemRowProps {
  item: InspectionItem;
  inspectionId: string;
  readOnly?: boolean;
}

export function InspectionItemRow({
  item,
  inspectionId,
  readOnly = false,
}: InspectionItemRowProps) {
  const [showObservations, setShowObservations] = useState(!!item.observations);
  const [observations, setObservations] = useState(item.observations || '');

  const updateItem = useUpdateInspectionItem();
  const uploadPhoto = useUploadInspectionPhoto();

  const photos = item.photo_urls || [];

  const handleComplianceToggle = (value: boolean) => {
    if (readOnly) return;
    const newValue = item.complies === value ? null : value;
    updateItem.mutate({
      itemId: item.id,
      inspectionId,
      data: { complies: newValue, observations },
    });
  };

  const handleObservationsBlur = () => {
    if (readOnly || observations === item.observations) return;
    updateItem.mutate({
      itemId: item.id,
      inspectionId,
      data: { complies: item.complies, observations },
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || readOnly) return;

    const url = await uploadPhoto.mutateAsync({
      inspectionId,
      itemKey: item.item_key,
      file,
    });

    // Append to existing photos array
    const newPhotos = [...photos, url];
    updateItem.mutate({
      itemId: item.id,
      inspectionId,
      data: { complies: item.complies, observations, photo_urls: newPhotos },
    });
  };

  const handleRemovePhoto = (index: number) => {
    if (readOnly) return;
    const newPhotos = photos.filter((_, i) => i !== index);
    updateItem.mutate({
      itemId: item.id,
      inspectionId,
      data: { complies: item.complies, observations, photo_urls: newPhotos },
    });
  };

  const isLoading = updateItem.isPending || uploadPhoto.isPending;
  const isPending = item.complies === null;

  return (
    <div className="border-b border-border/50 py-3 last:border-b-0">
      <div className="flex items-start gap-4">
        {/* Item label */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm',
              item.complies === true && 'text-green-700 dark:text-green-400',
              item.complies === false && 'text-destructive font-medium',
              isPending && 'text-muted-foreground',
            )}
          >
            {item.item_label}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Button
                type="button"
                variant={item.complies === true ? 'default' : 'outline'}
                size="icon"
                className={cn(
                  'h-10 w-10 transition-all',
                  item.complies === true
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                    : 'hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950/30',
                )}
                onClick={() => handleComplianceToggle(true)}
                disabled={readOnly}
                title="Cumple"
              >
                <Check className="w-5 h-5" />
              </Button>

              <Button
                type="button"
                variant={item.complies === false ? 'destructive' : 'outline'}
                size="icon"
                className={cn(
                  'h-10 w-10 transition-all',
                  item.complies === false
                    ? 'shadow-md'
                    : 'hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30',
                )}
                onClick={() => handleComplianceToggle(false)}
                disabled={readOnly}
                title="No cumple"
              >
                <X className="w-5 h-5" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              <Button
                type="button"
                variant={showObservations || observations ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowObservations(!showObservations)}
                title="Agregar observación"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>

              {!readOnly && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={readOnly}
                  />
                  <Button
                    type="button"
                    variant={photos.length > 0 ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                    asChild
                    title={`Subir foto (${photos.length})`}
                  >
                    <span className="relative">
                      <Camera className="w-4 h-4" />
                      {photos.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                          {photos.length}
                        </span>
                      )}
                    </span>
                  </Button>
                </label>
              )}
            </>
          )}
        </div>
      </div>

      {/* Photos gallery */}
      {photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((url, idx) => (
            <div key={idx} className="relative group">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`Foto ${idx + 1}`}
                  className="h-16 w-16 object-cover rounded border border-border hover:opacity-80 transition-opacity"
                />
              </a>
              {!readOnly && (
                <button
                  type="button"
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemovePhoto(idx)}
                  title="Eliminar foto"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Observations textarea */}
      {showObservations && (
        <div className="mt-3 ml-0">
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            onBlur={handleObservationsBlur}
            placeholder="Observaciones..."
            className="text-sm min-h-[60px]"
            disabled={readOnly}
          />
        </div>
      )}
    </div>
  );
}
