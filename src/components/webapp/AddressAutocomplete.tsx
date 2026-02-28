import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type { AddressResult } from '@/types/webapp';
import type { AddressResult } from '@/types/webapp';

interface AddressAutocompleteProps {
  apiKey: string | null;
  onSelect: (result: AddressResult | null) => void;
  selectedAddress?: AddressResult | null;
  disabled?: boolean;
}

export function AddressAutocomplete({
  apiKey,
  onSelect,
  selectedAddress,
  disabled,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(selectedAddress?.formatted_address ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ar' },
      fields: ['formatted_address', 'geometry', 'address_components'],
      types: ['address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formattedAddress = place.formatted_address ?? '';

      let neighborhoodName: string | undefined;
      const components = place.address_components ?? [];
      for (const comp of components) {
        if (
          comp.types.includes('neighborhood') ||
          comp.types.includes('sublocality_level_1') ||
          comp.types.includes('sublocality')
        ) {
          neighborhoodName = comp.long_name;
          break;
        }
      }

      const result: AddressResult = {
        formatted_address: formattedAddress,
        lat,
        lng,
        neighborhood_name: neighborhoodName,
      };

      setInputValue(formattedAddress);
      onSelect(result);
    });

    autocompleteRef.current = autocomplete;
  }, [onSelect]);

  // Load Google Maps script if not already loaded
  useEffect(() => {
    if (!apiKey) return;

    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', initAutocomplete);
      return;
    }

    setIsLoading(true);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoading(false);
      initAutocomplete();
    };
    script.onerror = () => {
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, [apiKey, initAutocomplete]);

  const handleClear = () => {
    setInputValue('');
    onSelect(null);
    autocompleteRef.current = null;
    setTimeout(() => initAutocomplete(), 100);
  };

  if (!apiKey) {
    return (
      <div className="space-y-2">
        <Label>Dirección de entrega</Label>
        <Input
          placeholder="Escribí tu dirección"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled
        />
        <p className="text-xs text-muted-foreground">
          El autocompletado de direcciones no está disponible en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" />
        ¿Dónde lo enviamos?
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={isLoading ? 'Cargando...' : 'Escribí tu dirección'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={disabled || isLoading}
          className="pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {selectedAddress && !isLoading && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
