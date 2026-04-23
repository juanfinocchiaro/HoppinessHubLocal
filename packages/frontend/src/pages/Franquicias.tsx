import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Rocket,
  GraduationCap,
  Smartphone,
  Handshake,
  Check,
  ArrowRight,
  Quote,
  MessageCircle,
  Users,
  TrendingUp,
  Clock,
  Trophy,
  Factory,
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import { MobileOrderFAB } from '@/components/ui/MobileOrderFAB';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { FranchiseFormSection } from '@/components/landing';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import heroWall from '@/assets/hero-wall.webp';
import local1 from '@/assets/local-1.jpg';
import logoHoppiness from '@/assets/logo-hoppiness-blue.png';

export default function Franquicias() {
  const stats = [
    { value: '1000+', label: 'Hamburguesas/día' },
    { value: '6', label: 'Clubes' },
    { value: '2018', label: 'Desde' },
    { value: '18-24', label: 'Meses recupero' },
  ];

  const benefits = [
    {
      icon: Factory,
      title: 'Recetas y Fábricas Propias',
      description:
        'Todas las recetas son nuestras. Trabajamos con fábricas propias para panes, salsas y medallones estandarizados.',
    },
    {
      icon: TrendingUp,
      title: 'Recupero en 18-24 Meses',
      description: 'Modelo de negocio probado con retorno de inversión demostrado.',
    },
    {
      icon: GraduationCap,
      title: 'Capacitación Completa',
      description:
        'Entrenamiento intensivo para vos y tu equipo. Te acompañamos en todo el proceso.',
    },
    {
      icon: Smartphone,
      title: 'Sistema de Gestión',
      description:
        'Software propio para control de stock, equipo y reportes. Desarrollando POS propio.',
    },
    {
      icon: Handshake,
      title: 'Alianzas Estratégicas',
      description: 'Trabajamos con Pepsi, McCain, Tonadita, Tabasco y NotCo.',
    },
    {
      icon: Trophy,
      title: 'Marca Premiada',
      description: '4 veces campeones. 50K seguidores. Reconocimiento en medios nacionales.',
    },
  ];

  const investmentIncludes = [
    'Canon de entrada',
    'Equipamiento completo de cocina',
    'Capacitación completa del equipo',
    'Stock inicial de insumos',
    'Campaña de marketing de lanzamiento',
    'Diseño y brandeo del local',
    'Sistema de gestión (stock, equipo, reportes)',
    'Manuales operativos completos',
  ];

  const steps = [
    { number: '1', title: 'Contacto', description: 'Completás el formulario y te contactamos' },
    { number: '2', title: 'Reunión', description: 'Nos juntamos a conocernos y evaluamos la zona' },
    { number: '3', title: 'Aprobación', description: 'Firmamos contrato y arrancamos obras' },
    { number: '4', title: '¡Apertura!', description: 'Tu local abre en aproximadamente 90 días' },
  ];

  const faqs = [
    {
      question: '¿Necesito experiencia en gastronomía?',
      answer:
        'No. Te capacitamos completamente durante 4 semanas. Lo que buscamos es gente con ganas, actitud comercial y capacidad de gestión.',
    },
    {
      question: '¿Puedo tener el local en cualquier ciudad?',
      answer:
        'Estamos evaluando expansión a todo el país. Actualmente operamos en Córdoba capital y alrededores. Contactanos para consultar disponibilidad en tu zona.',
    },
    {
      question: '¿Cuánto tiempo tarda la apertura?',
      answer:
        'Aproximadamente 90 días desde la firma del contrato, dependiendo de las obras necesarias en el local.',
    },
    {
      question: '¿Puedo tener más de un local?',
      answer:
        '¡Sí! Muchos de nuestros franquiciados tienen 2 o más locales. Es más, premiamos el crecimiento con mejores condiciones.',
    },
    {
      question: '¿Qué pasa si no funciona?',
      answer:
        'Tenemos un track record del 100% de locales exitosos. Nuestro modelo está probado y te acompañamos en cada paso para asegurar tu éxito.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Franquicias"
        description="Abrí tu propia franquicia Hoppiness Club. Modelo probado, recupero en 18-24 meses, recetas propias y capacitación completa."
        path="/franquicias"
      />
      <ImpersonationBanner />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroWall})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/90 to-primary/80" />

        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Trophy className="w-8 h-8 text-accent" />
              <span className="text-accent font-bold text-lg">4 VECES CAMPEONES</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 font-brand leading-tight">
              Llevá la mejor hamburguesa
              <br />
              <span className="text-accent">a tu ciudad</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-4">
              Sumate a la red de hamburgueserías más premiada de Córdoba.
            </p>
            <p className="text-lg text-white/80 mb-8">
              De 40 hamburguesas/día en 2020 a más de 1000/día. Y seguimos creciendo.
            </p>
            <a href="#formulario-franquicia">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 h-auto"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Quiero mi Franquicia
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-accent text-accent-foreground py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-4xl md:text-5xl font-black font-brand">{stat.value}</p>
                <p className="text-sm opacity-90">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Por qué Hoppiness */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            ¿POR QUÉ HOPPINESS?
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
            Un modelo de negocio probado, rentable y con todo el soporte que necesitás
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <Card
                key={i}
                className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-1"
              >
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quote del fundador */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <Quote className="w-12 h-12 mx-auto mb-6 opacity-50" />
          <blockquote className="text-2xl md:text-3xl font-medium mb-6 italic">
            "Nuestra franquicia le va a dar al franquiciado la posibilidad de entrar al rubro
            gastronómico vendiendo un producto de extrema calidad."
          </blockquote>
          <p className="text-primary-foreground/70">— Ismael Sánchez, Socio</p>
        </div>
      </section>

      {/* Inversión */}
      <section className="py-20 px-4 bg-secondary/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            INVERTÍ EN TU FUTURO
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Una inversión con retorno probado
          </p>

          <Card className="shadow-elevated">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="font-bold mb-4 text-lg">La inversión incluye:</h4>
                  <ul className="space-y-3">
                    {investmentIncludes.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-accent" />
                        </div>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-6">
                  <div className="p-4 bg-primary/5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Royalty mensual</span>
                    </div>
                    <p className="text-muted-foreground text-sm">4,5% sobre ventas</p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Fondo de marketing</span>
                    </div>
                    <p className="text-muted-foreground text-sm">0,5% sobre ventas</p>
                  </div>
                  <div className="p-4 bg-accent/10 rounded-xl border border-accent/30">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-accent" />
                      <span className="font-semibold text-accent">Recupero de inversión</span>
                    </div>
                    <p className="text-2xl font-black text-accent">18 a 24 meses</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                * Contactanos para una propuesta personalizada según tu zona y disponibilidad de
                inversión.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Proceso */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            4 PASOS PARA SER PARTE
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Un proceso simple y transparente
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="text-center relative">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-black font-brand">
                  {step.number}
                </div>
                <h4 className="font-bold text-lg mb-2">{step.title}</h4>
                <p className="text-muted-foreground text-sm">{step.description}</p>

                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-3 w-6 h-6 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full mb-4">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Tiempo estimado: 90 días hasta apertura</span>
            </div>
          </div>
        </div>
      </section>

      {/* Image break */}
      <section className="relative h-64 md:h-80">
        <img src={local1} alt="Interior Hoppiness" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-4xl font-black mb-4 font-brand text-center text-primary">
            PREGUNTAS FRECUENTES
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Todo lo que necesitás saber antes de dar el paso
          </p>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border rounded-xl px-6 shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Formulario embebido */}
      <FranchiseFormSection />

      {/* CTA Final */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary via-primary to-accent/80">
        <div className="container mx-auto max-w-3xl text-center">
          <img src={logoHoppiness} alt="Hoppiness Club" className="w-20 h-20 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 font-brand">
            ¿LISTO PARA SER PARTE DEL
            <br />
            <span className="text-accent">CULTO AL SABOR</span>?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            COMPLETÁ EL FORMULARIO Y UN ASESOR SE CONTACTARÁ EN MENOS DE 24 HORAS.
          </p>
          <a href="#formulario-franquicia">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-xl px-10 py-7 h-auto shadow-lg"
            >
              <Rocket className="w-6 h-6 mr-2" />
              ¡QUIERO MI FRANQUICIA!
            </Button>
          </a>
          <p className="text-white/60 text-sm mt-6">
            <MessageCircle className="w-4 h-4 inline mr-1" />
            Sin compromiso. Solo queremos conocerte.
          </p>
        </div>
      </section>

      <PublicFooter />
      <MobileOrderFAB />
    </div>
  );
}
