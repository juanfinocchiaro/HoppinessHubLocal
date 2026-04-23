import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Trophy, ArrowRight, Music, Store } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { MobileOrderFAB } from '@/components/ui/MobileOrderFAB';
import { PublicFooter } from '@/components/layout/PublicFooter';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import {
  AwardsSection,
  MediaSection,
  LocationsSection,
  ReviewsSection,
  MenuShowcaseSection,
} from '@/components/landing';
import fotoHero from '@/assets/foto-hero.jpg';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SEO path="/" />
      <ImpersonationBanner />

      {/* Hero Section - Full height, header overlays */}
      <section className="relative h-[85vh] min-h-[600px] flex items-end pb-16">
        <div
          className="absolute inset-0 bg-cover saturate-[1.05] brightness-105"
          style={{ backgroundImage: `url(${fotoHero})`, backgroundPosition: '65% 35%' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.45)_30%,rgba(0,0,0,0.1)_45%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.5)_0%,transparent_30%)]" />

        <div className="relative container mx-auto px-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-accent" />
              <span className="text-accent font-bold">4 VECES CAMPEONES</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 font-display tracking-tight leading-none">
              CULTO
              <br />
              AL SABOR!
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-2 font-brand">
              La hamburguesa más premiada de Córdoba
            </p>
            <p className="text-lg text-white/70 mb-8 max-w-lg">
              +15 creaciones de autor. Recetas propias desde 2018.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/pedir">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Pedí tu Hamburguesa
                </Button>
              </Link>
              <a href="#menu">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/80 text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm text-lg px-8"
                >
                  Ver Menú
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-gradient-to-r from-accent via-accent to-accent/90 text-accent-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-4xl font-black font-brand">1000+</p>
              <p className="text-sm opacity-90">Hamburguesas / día</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">6</p>
              <p className="text-sm opacity-90">Clubes</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">15+</p>
              <p className="text-sm opacity-90">Creaciones de autor</p>
            </div>
            <div>
              <p className="text-4xl font-black font-brand">2018</p>
              <p className="text-sm opacity-90">Año del primer club</p>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Showcase */}
      <section id="menu">
        <MenuShowcaseSection />
      </section>

      {/* Nuestros Clubes */}
      <section id="clubes">
        <LocationsSection />
      </section>

      {/* Premios */}
      <AwardsSection />

      {/* Medios */}
      <MediaSection />

      {/* Spotify - Modo Hoppi */}
      <section className="py-16 px-4 bg-foreground text-background">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="w-8 h-8 text-accent" />
            <h2 className="text-3xl font-black font-brand">MODO HOPPI</h2>
          </div>
          <p className="text-background/70 mb-6 text-lg">LA MÚSICA QUE SUENA EN NUESTROS CLUBES</p>
          <a
            href="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-bold transition-colors"
          >
            Escuchá en Spotify
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </section>

      {/* Reviews Section */}
      <ReviewsSection />

      {/* CTA Franquicias - Simple, 1 sección */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <Store className="w-10 h-10 mx-auto mb-4 text-accent" />
          <h2 className="text-3xl md:text-4xl font-black font-brand mb-4">
            ¿QUERÉS TU PROPIO HOPPINESS?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-6">
            CONOCÉ NUESTRO MODELO DE FRANQUICIAS. RECUPERO EN 18-24 MESES. RECETAS Y FÁBRICAS
            PROPIAS.
          </p>
          <Link to="/franquicias">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8">
              Más info sobre franquicias
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
      <MobileOrderFAB />
    </div>
  );
}
