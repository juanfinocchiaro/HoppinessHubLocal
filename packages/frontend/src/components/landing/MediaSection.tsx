import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Quote, Newspaper, Building2, Trophy } from 'lucide-react';

// Bloque 1: Medios de negocios
const businessMedia = [
  {
    source: 'InfoNegocios',
    quote: 'Es 100% cordobesa, vende 600 hamburguesas por día y planea expandirse con franquicias',
    year: '2021',
    context: 'Nota sobre crecimiento y modelo de negocio',
  },
  {
    source: 'La Voz del Interior',
    quote: 'La hamburguesa que rompe todos los estándares',
    year: '2022',
    context: 'Perfil de marca y expansión',
  },
];

// Bloque 2: Timeline Semana Hamburguesa
const timelineEvents = [
  {
    year: '2021',
    title: 'Sponsor oficial',
    subtitle: 'Anfitriones del lanzamiento',
    isAward: false,
  },
  { year: '2022', title: 'Campeones', subtitle: 'Mejor Clásica', isAward: true },
  { year: '2024', title: 'Doble campeones', subtitle: 'Mejor Clásica + Gourmet', isAward: true },
  { year: '2024', title: 'Mejor Hamburguesería', subtitle: 'de Córdoba', isAward: true },
];

const coveringMedia = ['Circuito Gastronómico', 'InfoNegocios', 'La Voz del Interior'];

// Bloque 3: Diseño internacional
const designMedia = [
  { name: 'e-architect', country: 'Reino Unido', flag: '🇬🇧', year: '2020' },
  { name: '88DesignBox', country: 'Internacional', flag: '🌍', year: '2020' },
  { name: 'Archiscene', country: 'Internacional', flag: '🌍', year: '2020' },
  { name: 'Estilo Propio', country: 'Argentina', flag: '🇦🇷', year: '2020' },
];

export function MediaSection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
          UNA MARCA QUE DA QUE HABLAR
        </h2>
        <p className="text-center text-muted-foreground mb-16 text-lg max-w-2xl mx-auto">
          No lo decimos nosotros. Lo dicen los medios.
        </p>

        {/* Bloque 1: Medios de negocios */}
        <div className="mb-16">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            Los medios de negocios nos siguen
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {businessMedia.map((item, i) => (
              <Card key={i} className="shadow-card hover:shadow-elevated transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-lg">{item.source}</span>
                    <Badge variant="secondary">{item.year}</Badge>
                  </div>
                  <div className="relative mb-3">
                    <Quote className="w-6 h-6 text-accent/30 absolute -top-1 -left-1" />
                    <p className="text-muted-foreground italic pl-5">"{item.quote}"</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.context}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bloque 2: Semana de la Hamburguesa Timeline */}
        <div className="mb-16 bg-secondary/50 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            Líderes en la Semana de la Hamburguesa
          </h3>
          <p className="text-muted-foreground mb-8">
            El evento gastronómico más importante de Córdoba, organizado por Circuito Gastronómico
          </p>

          {/* Timeline horizontal */}
          <div className="relative mb-8">
            {/* Línea conectora */}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-primary/20 hidden md:block" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {timelineEvents.map((event, i) => (
                <div key={i} className="text-center relative">
                  <div
                    className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                      event.isAward
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {event.isAward ? (
                      <Trophy className="w-6 h-6" />
                    ) : (
                      <span className="text-sm font-bold">{event.year}</span>
                    )}
                  </div>
                  <p className="text-2xl font-black font-brand text-primary">{event.year}</p>
                  <p className="font-bold text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Medios que cubren */}
          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              Medios que cubren nuestra participación:
            </p>
            <div className="flex flex-wrap gap-2">
              {coveringMedia.map((media, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {media}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Cada año, más de 8 medios cubren nuestra participación en el evento.
            </p>
          </div>
        </div>

        {/* Bloque 3: Diseño internacional */}
        <div>
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Nuestros locales, publicados en el mundo
          </h3>
          <p className="text-muted-foreground mb-6">
            El diseño de Hoppiness fue creado por Estudio Montevideo y publicado en revistas de
            arquitectura internacionales
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {designMedia.map((media, i) => (
              <Card
                key={i}
                className="shadow-card text-center hover:shadow-elevated transition-all"
              >
                <CardContent className="p-4">
                  <span className="text-3xl mb-2 block">{media.flag}</span>
                  <p className="font-bold">{media.name}</p>
                  <p className="text-xs text-muted-foreground">{media.country}</p>
                  <p className="text-xs text-muted-foreground">{media.year}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cita destacada */}
          <div className="bg-primary/5 rounded-xl p-6 max-w-2xl mx-auto">
            <Quote className="w-8 h-8 text-primary/30 mb-3" />
            <p className="text-lg italic text-muted-foreground mb-3">
              "Vibrant colors and eccentric geometries... a club of friends looking for friends."
            </p>
            <p className="text-sm font-medium text-primary">
              — e-architect, sobre el diseño de Hoppiness
            </p>
          </div>
        </div>

        {/* Mensaje final */}
        <p className="text-center text-muted-foreground mt-12 text-sm max-w-xl mx-auto">
          Cuando abrís una franquicia Hoppiness, no abrís un local. Abrís un caso de estudio que
          revistas internacionales publican.
        </p>
      </div>
    </section>
  );
}
