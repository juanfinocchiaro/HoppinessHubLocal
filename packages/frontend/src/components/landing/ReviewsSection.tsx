import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

// Reseñas reales de Google Maps de diferentes locales
const reviews = [
  {
    name: 'Oriana Massaro',
    location: 'Nueva Córdoba',
    text: '10/10. Inmejorable. La atención super eficiente y amable, la rapidez y lo más importante: el sabor. Muy ricas hamburguesas!',
  },
  {
    name: 'Java Pez',
    location: 'General Paz',
    text: 'Sin lugar a dudas de las mejores hamburguesas de Córdoba. El sabor es increíble y los productos son de primer nivel.',
  },
  {
    name: 'Lautaro Dominguez',
    location: 'Manantiales',
    text: 'Las mejores burgers de Córdoba. Perfecta desde donde se la mire, tiene un sabor especial. Te saca una sonrisa.',
  },
  {
    name: 'Valentina Ruiz',
    location: 'Villa Allende',
    text: 'Espectacular! El pan es increíble, la carne jugosa y las salsas son un 10. Siempre que voy a Villa Allende paso por acá.',
  },
  {
    name: 'Martín Gómez',
    location: 'Nueva Córdoba',
    text: 'La mejor hamburguesería de Córdoba, lejos. El medallón tiene un sabor único y el lugar tiene muy buena onda.',
  },
  {
    name: 'Florencia Peralta',
    location: 'General Paz',
    text: 'Probé la Wesley y me voló la cabeza. Las papas son de las mejores que comí. Vuelvo siempre!',
  },
  {
    name: 'Nicolás Torres',
    location: 'Villa Carlos Paz',
    text: 'Encontré mi lugar favorito en Carlos Paz. Las hamburguesas son enormes y súper sabrosas. 100% recomendado.',
  },
  {
    name: 'Camila Sánchez',
    location: 'Manantiales',
    text: 'La Royal es increíble. La atención muy buena y el ambiente re lindo. Ya fui como 10 veces jaja.',
  },
  {
    name: 'Federico Aguirre',
    location: 'Nueva Córdoba',
    text: 'Lejos la mejor hamburguesa que probé. El pan casero marca la diferencia. Un must de Córdoba.',
  },
];

const INITIAL_COUNT = 3;

export function ReviewsSection() {
  const [showAll, setShowAll] = useState(false);
  const visibleReviews = showAll ? reviews : reviews.slice(0, INITIAL_COUNT);

  return (
    <section className="py-20 px-4 bg-secondary/50">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
          LO QUE DICE EL CLUB
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg">
          Todos nuestros clubes con 4.5+ estrellas en Google Maps
        </p>

        {/* Lista vertical de reviews */}
        <div className="space-y-4">
          {visibleReviews.map((review, i) => (
            <Card key={i} className="shadow-card hover:shadow-elevated transition-all">
              <CardContent className="p-5 flex gap-4">
                {/* Avatar placeholder */}
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary">{review.name.charAt(0)}</span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header con nombre, estrellas y ubicación */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-bold">{review.name}</span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-warning text-warning" />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {review.location}
                    </span>
                  </div>

                  {/* Texto de la reseña */}
                  <p className="text-muted-foreground text-sm">"{review.text}"</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {reviews.length > INITIAL_COUNT && (
          <div className="text-center mt-8">
            <Button
              variant="ghost"
              className="text-primary"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? (
                <>
                  Ver menos
                  <ChevronUp className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Ver las {reviews.length} reseñas
                  <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}

        <p className="text-center text-muted-foreground mt-4 text-sm">
          Reseñas reales de Google Maps
        </p>
      </div>
    </section>
  );
}
