import { Trophy } from 'lucide-react';

const awards = [
  { year: '2022', title: 'Mejor Hamburguesa Clásica', event: 'Circuito Gastronómico' },
  { year: '2024', title: 'Mejor Hamburguesa Clásica', event: 'Circuito Gastronómico' },
  { year: '2024', title: 'Mejor Hamburguesa Gourmet', event: 'Circuito Gastronómico' },
  { year: '2024', title: 'Mejor Hamburguesería', event: 'Circuito Gastronómico' },
];

export function AwardsSection() {
  return (
    <section className="py-20 px-4 bg-secondary/50">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
          MULTICAMPEONES EN CÓRDOBA
        </h2>
        <p className="text-center text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
          Elegidos por Circuito Gastronómico, el evento gastronómico más importante de la provincia
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {awards.map((award, i) => (
            <div
              key={i}
              className="bg-background rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all hover:-translate-y-1 text-center group"
            >
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/30 transition-colors">
                <Trophy className="w-8 h-8 text-accent" />
              </div>
              <p className="text-3xl font-black font-brand text-primary mb-2">{award.year}</p>
              <h3 className="font-bold text-lg mb-1">{award.title}</h3>
              <p className="text-sm text-muted-foreground">{award.event}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-muted-foreground mt-8 text-sm">
          🏆 Sponsor oficial del Circuito Gastronómico desde 2021
        </p>
      </div>
    </section>
  );
}
