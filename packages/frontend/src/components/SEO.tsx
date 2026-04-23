import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Hoppiness Club';
const DEFAULT_TITLE = 'Hoppiness Club | La hamburguesa más premiada de Córdoba';
const DEFAULT_DESCRIPTION =
  'Hoppiness Club - 4 veces campeones. La hamburguesería más premiada de Córdoba. Franquicias disponibles en todo el país.';
const BASE_URL = 'https://hoppinessclub.com';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  type?: string;
}

export function SEO({ title, description, path = '', type = 'website' }: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESCRIPTION;
  const canonical = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
}
