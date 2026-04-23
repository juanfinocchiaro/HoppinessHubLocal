import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trophy, Rocket } from 'lucide-react';

const timeline = [
  {
    year: '2018',
    text: 'Nace Hoppiness como club de cervezas en Cofico, un pequeño barrio de Córdoba.',
    highlight: false,
  },
  {
    year: '2019',
    text: 'Abrimos en Nueva Córdoba. La gente empieza a pedirnos hamburguesas.',
    highlight: false,
  },
  {
    year: '2020',
    text: 'Pivoteamos. Apostamos 100% a las hamburguesas. De 40 a 600 por día.',
    highlight: false,
  },
  { year: '2022', text: 'Primer premio: Mejor Hamburguesa Clásica de Córdoba.', highlight: true },
  {
    year: '2023',
    text: 'Expansión: Manantiales y Villa Allende. Inauguramos centro de producción.',
    highlight: false,
  },
  { year: '2024', text: 'Doble campeones: Mejor Clásica y Mejor Gourmet.', highlight: true },
  {
    year: '2024',
    text: 'Mejor Hamburguesería de Córdoba. Expansión: General Paz y Villa Carlos Paz.',
    highlight: true,
  },
  { year: '2026', text: 'Shopping Pocito. Y seguimos creciendo...', highlight: false },
];

export function TimelineSection() {
  return (
    <section className="py-20 px-4 bg-secondary/50">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
          DE COFICO AL PAÍS
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg">
          Nuestra historia de crecimiento
        </p>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary/20 transform md:-translate-x-1/2" />

          <div className="space-y-8">
            {timeline.map((item, i) => (
              <div
                key={i}
                className={`relative flex items-start gap-4 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
              >
                {/* Year bubble */}
                <div
                  className={`absolute left-6 md:left-1/2 transform -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center z-10 ${item.highlight ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}
                >
                  {item.highlight ? (
                    <Trophy className="w-5 h-5 md:w-6 md:h-6" />
                  ) : (
                    <span className="font-bold text-xs md:text-sm">{item.year}</span>
                  )}
                </div>

                {/* Content */}
                <div
                  className={`ml-20 md:ml-0 md:w-[calc(50%-4rem)] ${i % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left'}`}
                >
                  <div className="bg-background rounded-xl p-4 shadow-card">
                    {item.highlight && (
                      <p className="text-accent font-bold text-sm mb-1">🏆 {item.year}</p>
                    )}
                    {!item.highlight && (
                      <p className="text-primary font-bold text-sm mb-1 md:hidden">{item.year}</p>
                    )}
                    <p className="text-muted-foreground text-sm md:text-base">{item.text}</p>
                  </div>
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden md:block md:w-[calc(50%-4rem)]" />
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Link to="/franquicias">
            <Button size="lg" className="group">
              <Rocket className="w-5 h-5 mr-2" />
              Sé parte de esta historia
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
