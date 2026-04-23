import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Beef, RefreshCw, Smile, Wrench, ShoppingBag, Users, Users2 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { MobileOrderFAB } from '@/components/ui/MobileOrderFAB';
import { PublicFooter } from '@/components/layout/PublicFooter';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import heroWall from '@/assets/hero-wall.webp';
import juanHoppiness from '@/assets/juan-hoppiness.jpg';
import team1 from '@/assets/team-1.jpg';
import team2 from '@/assets/team-2.jpg';
import team3 from '@/assets/team-3.jpg';
import team4 from '@/assets/team-4.jpg';
import team5 from '@/assets/team-5.jpg';
import team6 from '@/assets/team-6.jpg';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

export default function Nosotros() {
  const valores = [
    {
      icon: Beef,
      title: 'Culto al sabor',
      description:
        'Le metemos garra y corazón a cada receta, usando los mejores ingredientes para que cada mordisco sea tu propia fiesta.',
    },
    {
      icon: RefreshCw,
      title: 'Adaptabilidad',
      description:
        'No nos dormimos en los laureles. Estamos siempre atentos a lo que se viene, probando cosas nuevas para que siempre tengas una buena excusa para volver.',
    },
    {
      icon: Smile,
      title: 'Optimismo',
      description:
        'Acá siempre hay buena vibra. Un ambiente amigable para que vengas a disfrutar con quien quieras. Queremos que te sientas como en casa.',
    },
    {
      icon: Wrench,
      title: 'Resolución',
      description:
        'Si hay un problema, le buscamos la vuelta. Nos encantan los desafíos y aprendemos de los errores. Tu experiencia tiene que ser siempre de primera.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Nosotros"
        description="Conocé la historia de Hoppiness Club: desde un club de cerveza en Cofico hasta la hamburguesería más premiada de Córdoba."
        path="/nosotros"
      />
      <ImpersonationBanner />

      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroWall})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/70" />

        <div className="relative container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 font-brand">
            NUESTRA HISTORIA
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            DESDE 2018 CREANDO EL CULTO AL SABOR
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6 font-brand text-primary">QUIÉNES SOMOS</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Hoppiness Club nació en Córdoba en 2018 como un club de cerveza y encuentro. Desde
                el primer día la idea fue clara: crear algo con identidad propia, producto cuidado y
                una experiencia simple, bien hecha.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                En 2019 abrimos en Nueva Córdoba. Cuando llegó la pandemia, tomamos una decisión que
                nos marcó para siempre: foco total en hamburguesas. Ahí empezó el Culto al Sabor.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Pasamos de ser un bar a ser una hamburguesería especializada, con recetas de autor,
                procesos estandarizados y un equipo entrenado para sostener el mismo nivel en cada
                servicio, en cada local, todos los días.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Hoy somos una marca cordobesa en expansión, con múltiples clubes y una comunidad que
                nos elige. Y seguimos sosteniendo lo de siempre: producto fuerte, identidad clara y
                muchas ganas de seguir creciendo.
              </p>
              <div className="border-t pt-6 mt-6">
                <p className="text-lg font-medium text-foreground italic">
                  Una marca con historia real, producto probado y un club que no para de crecer.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src={juanHoppiness}
                alt="Juan Finocchiaro, fundador de Hoppiness Club"
                className="rounded-2xl shadow-elevated w-full max-w-sm aspect-[9/16] object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Nuestros Valores */}
      <section className="py-20 px-4 bg-secondary/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            NUESTROS VALORES
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Lo que nos define y nos mueve cada día
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valores.map((valor, i) => (
              <Card
                key={i}
                className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-1 text-center"
              >
                <CardContent className="pt-8 pb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <valor.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{valor.title}</h3>
                  <p className="text-muted-foreground text-sm">{valor.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* El Equipo */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4 font-brand text-primary">NUESTRO EQUIPO</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Detrás de cada hamburguesa hay un equipo apasionado. Desde los fundadores hasta cada
              uno de nuestros colaboradores, todos compartimos la misma visión: ofrecer la mejor
              experiencia gastronómica.
            </p>
          </div>

          {/* Galería de fotos del equipo - Masonry style */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            <img
              src={team1}
              alt="Equipo Hoppiness celebrando"
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover"
            />
            <img
              src={team5}
              alt="Equipo sacándose una selfie en el local"
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover md:translate-y-8"
            />
            <img
              src={team2}
              alt="Equipo en cocina"
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover"
            />
            <img
              src={team4}
              alt="Equipo de cocina con delantales Hoppiness"
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover md:-translate-y-4"
            />
            <img
              src={team3}
              alt="Celebración del equipo"
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover md:translate-y-4"
            />
            <img
              src={team6}
              alt="Equipo pasándola bien en el local"
              className="rounded-2xl shadow-card hover:shadow-elevated transition-all w-full h-64 object-cover md:-translate-y-8"
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-xl">
              <Users2 className="w-12 h-12 text-accent" />
              <div>
                <p className="font-bold text-lg">+50 colaboradores</p>
                <p className="text-sm text-muted-foreground">En todas nuestras sucursales</p>
              </div>
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              Creemos en el trabajo en equipo, la capacitación constante y en crear un ambiente
              laboral donde todos puedan crecer. Nuestro equipo es nuestra familia.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <img src={logoHoppiness} alt="Hoppiness Club" className="w-20 h-20 mx-auto mb-6" />
          <h2 className="text-4xl font-black mb-4 font-brand">¿QUERÉS SER PARTE?</h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            SUMATE AL CULTO AL SABOR COMO CLIENTE O COMO FRANQUICIADO
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/pedir">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Pedir Ahora
              </Button>
            </Link>
            <Link to="/franquicias">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                <Users className="w-5 h-5 mr-2" />
                Franquicias
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
      <MobileOrderFAB />
    </div>
  );
}
