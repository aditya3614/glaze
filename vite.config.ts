import { defineConfig, loadEnv } from 'vite';
import type { HtmlTagDescriptor, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { FAQ, FEATURES, SITE_NAME } from './src/content.ts';

/**
 * Adds everything that needs the public URL (canonical link, absolute social
 * preview image), structured data built from the page copy, robots.txt and a sitemap.
 */
function seo(siteUrl: string): Plugin {
  const url = siteUrl.replace(/\/+$/, '');
  const tag = (tagName: string, attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: tagName, attrs, injectTo: 'head' });

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: SITE_NAME,
        ...(url && { url: `${url}/` }),
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        description: 'Free screenshot beautifier with backgrounds, window frames, annotations and redaction. Runs in your browser.',
        featureList: FEATURES.map((f) => f.title),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };

  return {
    name: 'glaze-seo',
    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(structuredData), injectTo: 'head' },
      ];
      if (url) {
        const image = `${url}/og-image.jpg`;
        tags.push(
          tag('link', { rel: 'canonical', href: `${url}/` }),
          tag('meta', { property: 'og:url', content: `${url}/` }),
          tag('meta', { property: 'og:image', content: image }),
          tag('meta', { property: 'og:image:width', content: '1200' }),
          tag('meta', { property: 'og:image:height', content: '630' }),
          tag('meta', { property: 'og:image:alt', content: 'A screenshot framed and styled with Glaze' }),
          tag('meta', { name: 'twitter:image', content: image }),
        );
      }
      return tags;
    },
    generateBundle(options) {
      // Only the client build ships to the site.
      if (options.dir?.endsWith('dist-ssr')) return;
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n${url ? `\nSitemap: ${url}/sitemap.xml\n` : ''}`,
      });
      if (url) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source:
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            `  <url><loc>${url}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n` +
            '</urlset>\n',
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  if (mode === 'production' && !env.SITE_URL) {
    console.warn('\n[glaze-seo] SITE_URL is not set: canonical link, social image and sitemap are skipped.\n');
  }
  return {
    plugins: [react(), tailwindcss(), seo(env.SITE_URL ?? '')],
  };
});
