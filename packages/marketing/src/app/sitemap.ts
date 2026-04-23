import type { MetadataRoute } from 'next';

const BASE_URL = 'https://restostack.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/funciones', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/precios', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/para-chains', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/clientes', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/clientes/hoppiness', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/contacto', priority: 0.8, changeFrequency: 'yearly' as const },
    { path: '/blog', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/nosotros', priority: 0.5, changeFrequency: 'yearly' as const },
    { path: '/legal/terminos', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/privacidad', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/seguridad', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
