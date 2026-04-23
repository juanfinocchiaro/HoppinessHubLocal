// Framer Motion variants canónicas — sistema de animaciones RestoStack
import type { Variants } from 'framer-motion';

export const EASING_SMOOTH = [0.22, 1, 0.36, 1] as const;
export const EASING_ELASTIC = [0.34, 1.56, 0.64, 1] as const;

/** Fade + slide-up 40px. Usado en scroll reveal de secciones. */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASING_SMOOTH },
  },
};

/** Versión más lenta para headings grandes */
export const fadeUpSlowVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASING_SMOOTH },
  },
};

/** Stagger container — aplica delay escalonado 80ms a cada hijo */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0,
    },
  },
};

/** Stagger más lento para elementos hero */
export const staggerHero: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/** Fade simple, para cuando prefers-reduced-motion está activo */
export const fadeOnlyVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
};

/** Viewport options para whileInView */
export const viewportOpts = { once: true, amount: 0.2 } as const;
