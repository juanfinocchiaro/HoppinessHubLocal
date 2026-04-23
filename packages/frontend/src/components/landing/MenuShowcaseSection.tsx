import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

import clasicasImg from '@/assets/menu/clasicas.webp';
import originalesImg from '@/assets/menu/originales.webp';
import veggiesImg from '@/assets/menu/veggies.webp';
import ultrasmashImg from '@/assets/menu/ultrasmash.webp';

const categories = [
  {
    name: 'Clásicas',
    image: clasicasImg,
    products: ['Victoria', 'American Simple', 'American Doble'],
    description: 'Las de siempre. Smash puro.',
  },
  {
    name: 'Originales',
    image: originalesImg,
    products: ['Argenta', 'Royal', 'Provoleta'],
    description: 'Combinaciones únicas de autor.',
  },
  {
    name: 'Veggies',
    image: veggiesImg,
    products: ['Not American', 'Not Chicken'],
    description: '100% vegetal. 100% sabor.',
  },
  {
    name: 'Ultrasmash',
    image: ultrasmashImg,
    products: ['Ultra Cheese', 'Ultra Bacon'],
    description: 'La máxima expresión del smash.',
  },
];

export function MenuShowcaseSection() {
  return (
    <section className="py-20 px-4 bg-foreground">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-3 font-display text-accent">NUESTRO MENÚ</h2>
          <p className="text-background/70 text-lg">
            +15 creaciones de autor. Recetas propias que no vas a encontrar en otro lado.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to="/pedir"
              className="group relative rounded-2xl overflow-hidden aspect-[3/4] cursor-pointer"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                style={{ objectPosition: '50% 40%' }}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-black text-lg font-brand mb-1">{cat.name}</h3>
                <p className="text-white/70 text-xs leading-tight">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link to="/pedir">
            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 group"
            >
              Ver Menú Completo
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
