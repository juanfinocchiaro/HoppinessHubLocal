import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/blog';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, post.tags);

  return (
    <>
      {/* Article header */}
      <section
        style={{
          background: 'var(--carbon)',
          paddingTop: 128,
          paddingBottom: 80,
          paddingLeft: 32,
          paddingRight: 32,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'var(--dots-dark)',
            backgroundSize: 'var(--dots-size)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Link
            href="/blog"
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ceniza)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32 }}
          >
            ← Blog
          </Link>

          {post.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ceniza)', background: 'var(--humo)', padding: '3px 8px', borderRadius: 2 }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontVariationSettings: '"opsz" 144',
              fontWeight: 700,
              fontSize: 'clamp(32px, 5vw, 56px)',
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
              color: 'var(--papel)',
              marginBottom: 24,
            }}
          >
            {post.title}
          </h1>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--piedra)' }}>{post.author}</span>
            <span style={{ color: 'var(--humo)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--piedra)' }}>
              {new Date(post.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span style={{ color: 'var(--humo)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--piedra)' }}>{post.readingTime}</span>
          </div>
        </div>
      </section>

      {/* Article body — scoped prose styles */}
      <section style={{ background: 'var(--papel)', padding: '64px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <style>{`
            .blog-prose h1 { font-family: var(--font-serif); font-weight: 700; font-size: 36px; letter-spacing: -0.02em; color: var(--carbon); margin: 40px 0 16px; line-height: 1.15; }
            .blog-prose h2 { font-family: var(--font-serif); font-weight: 700; font-size: 26px; letter-spacing: -0.015em; color: var(--carbon); margin: 40px 0 16px; line-height: 1.2; }
            .blog-prose h3 { font-family: var(--font-sans); font-weight: 600; font-size: 19px; color: var(--carbon); margin: 28px 0 12px; }
            .blog-prose p { font-family: var(--font-serif); font-variation-settings: "opsz" 9; font-size: 18px; color: var(--humo); line-height: 1.75; margin-bottom: 20px; }
            .blog-prose ul, .blog-prose ol { margin: 0 0 20px 24px; display: flex; flex-direction: column; gap: 8px; }
            .blog-prose li { font-family: var(--font-sans); font-size: 17px; color: var(--humo); line-height: 1.65; }
            .blog-prose strong { font-weight: 600; color: var(--carbon); }
            .blog-prose blockquote { border-left: 3px solid var(--brasa); padding-left: 20px; margin: 24px 0; font-style: italic; }
            .blog-prose code { font-family: var(--font-mono); font-size: 14px; background: var(--crema); padding: 2px 6px; border-radius: 3px; color: var(--carbon); }
            .blog-prose pre { font-family: var(--font-mono); font-size: 13px; background: var(--carbon); color: var(--hueso); padding: 24px; border-radius: 6px; overflow-x: auto; margin: 24px 0; line-height: 1.6; }
            .blog-prose pre code { background: none; padding: 0; font-size: inherit; }
            .blog-prose hr { border: none; border-top: 1px solid var(--crema); margin: 48px 0; }
            .blog-prose a { color: var(--brasa); text-decoration: underline; text-underline-offset: 3px; }
          `}</style>
          <div
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </div>
      </section>

      {/* Related posts */}
      {related.length > 0 && (
        <section style={{ background: 'var(--crema)', padding: '64px 32px', borderTop: '1px solid var(--hueso)' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--ceniza)', marginBottom: 32 }}>
              TAMBIÉN TE PUEDE INTERESAR
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
              {related.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: 'none' }}>
                  <article>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.015em', color: 'var(--carbon)', marginBottom: 8, lineHeight: 1.3 }}>
                      {p.title}
                    </h3>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ceniza)', lineHeight: 1.5 }}>
                      {p.excerpt}
                    </p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
