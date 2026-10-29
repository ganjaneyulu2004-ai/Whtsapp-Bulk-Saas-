import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')
    ? process.env.NEXTAUTH_URL.replace(/\/$/, '')
    : 'https://oneample.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/settings/',
          '/billing/',
          '/appointments/',
          '/campaigns/',
          '/create-campaign/',
          '/inbox/',
          '/payment-pending/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
