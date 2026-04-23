import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, Users, Handshake, ArrowRight } from 'lucide-react';

interface SumateCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  to: string;
}

function SumateCard({ icon, title, description, buttonText, to }: SumateCardProps) {
  return (
    <Card className="group bg-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 border-border/50">
      <CardContent className="p-8 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {icon}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
        <Link to={to}>
          <Button
            variant="ghost"
            className="mt-2 text-primary hover:text-primary/80 group-hover:translate-x-1 transition-transform"
          >
            {buttonText}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function SumateSection() {
  return (
    <section className="py-20 px-4 bg-secondary/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4 font-brand text-primary">SUMATE A HOPPINESS</h2>
          <p className="text-lg text-muted-foreground">
            HAY MUCHAS FORMAS DE SER PARTE DE LA FAMILIA
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <SumateCard
            icon={<Store className="w-8 h-8" />}
            title="Franquicias"
            description="Abrí tu propio Hoppiness Club y sé parte de nuestra red de locales."
            buttonText="Más info"
            to="/franquicias"
          />

          <SumateCard
            icon={<Users className="w-8 h-8" />}
            title="Trabajá con nosotros"
            description="Sumate al equipo y formá parte de la mejor hamburguesería."
            buttonText="Postulate"
            to="/contacto?asunto=empleo"
          />

          <SumateCard
            icon={<Handshake className="w-8 h-8" />}
            title="Proveedores"
            description="¿Querés ser proveedor de Hoppiness Club? Contactanos."
            buttonText="Contactanos"
            to="/contacto?asunto=proveedor"
          />
        </div>
      </div>
    </section>
  );
}
