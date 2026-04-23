import { Card, CardContent } from '@/components/ui/card';
import { Factory, Palette, Handshake, Monitor, GraduationCap, TrendingUp } from 'lucide-react';

const reasons = [
  {
    icon: Factory,
    title: 'Recetas y fábricas propias',
    description:
      'Todas las recetas son nuestras. Trabajamos con fábricas propias para panes, salsas y medallones estandarizados.',
  },
  {
    icon: Palette,
    title: 'Diseño de marca reconocido',
    description:
      'Locales diseñados por Estudio Montevideo, con presencia en Argentina y España. Publicados en medios internacionales.',
  },
  {
    icon: Handshake,
    title: 'Alianzas estratégicas',
    description: 'Trabajamos con Pepsi, McCain, Tonadita, Tabasco y NotCo.',
  },
  {
    icon: Monitor,
    title: 'Sistema de gestión',
    description:
      'Software propio para control de stock, equipo y reportes. Desarrollando POS propio.',
  },
  {
    icon: GraduationCap,
    title: 'Capacitación completa',
    description: 'Entrenamiento para vos y tu equipo. Acompañamiento en la apertura y operación.',
  },
  {
    icon: TrendingUp,
    title: 'Marca en crecimiento',
    description: 'De 40 hamburguesas/día en 2020 a más de 1000/día. 6 locales y expandiendo.',
  },
];

export function WhyHoppinessSection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
          ¿POR QUÉ ELEGIR HOPPINESS?
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
          UN MODELO DE NEGOCIO PROBADO CON TODO LO QUE NECESITÁS PARA TRIUNFAR
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((reason, i) => (
            <Card
              key={i}
              className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <reason.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{reason.title}</h3>
                <p className="text-muted-foreground">{reason.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
