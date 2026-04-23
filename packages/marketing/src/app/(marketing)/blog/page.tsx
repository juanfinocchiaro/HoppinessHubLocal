import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { PageHero } from '@/components/marketing/PageHero';

export const metadata: Metadata = {
  title: 'Blog — RestoStack',
  description: 'Artículos sobre operación gastronómica, costeo, multi-canal y gestión de restaurantes.',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <PageHero
        kicker="BLOG"
        headline="Operación gastronómica, en serio."
        background="carbon"
      />

      <section style={{ background: 'var(--papel)', padding: '80px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {posts.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--ceniza)', textAlign: 'center', padding: '40px 0' }}>
              Los primeros posts llegan pronto.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {posts.map((post) => (
                <li
                  key={post.slug}
                  style={{ borderBottom: '1px solid var(--crema)', paddingBottom: 40, marginBottom: 40 }}
                >
                  <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                    <article>
                      {post.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontFamily: 'var(--font-sans)',
                                fontWeight: 500,
                                fontSize: 10,
                                textTransform: 'uppercase',
                                letterSpacing: '0.18em',
                                color: 'var(--ceniza)',
                                background: 'var(--crema)',
                                padding: '3px 8px',
                                borderRadius: 2,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <h2
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontWeight: 700,
                          fontSize: 28,
                          letterSpacing: '-0.02em',
                          color: 'var(--carbon)',
                          marginBottom: 12,
                          lineHeight: 1.2,
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {post.title}
                      </h2>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--ceniza)', lineHeight: 1.6, marginBottom: 12 }}>
                        {post.excerpt}
                      </p>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--piedra)' }}>
                          {new Date(post.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span style={{ color: 'var(--hueso)' }}>·</span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--piedra)' }}>
                          {post.readingTime}
                        </span>
                      </div>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
