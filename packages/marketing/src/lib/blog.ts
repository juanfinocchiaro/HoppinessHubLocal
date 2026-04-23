import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  readingTime: string;
  excerpt: string;
  content: string;
  contentHtml: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'blog');

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));

  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx$/, '');
    return getPostBySlug(slug);
  }).filter((p): p is BlogPost => p !== null);

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const rt = readingTime(content);

  // Compile Markdown to HTML synchronously
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false });
  const contentHtml = String(processor.processSync(content));

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    author: data.author ?? 'RestoStack',
    tags: data.tags ?? [],
    readingTime: rt.text,
    excerpt: data.excerpt ?? content.slice(0, 160).replace(/\n/g, ' ') + '...',
    content,
    contentHtml,
  };
}

export function getRelatedPosts(slug: string, tags: string[], limit = 2): BlogPost[] {
  const all = getAllPosts().filter((p) => p.slug !== slug);
  const withScore = all.map((p) => ({
    post: p,
    score: p.tags.filter((t) => tags.includes(t)).length,
  }));
  return withScore
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.post);
}
