import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://getgas.com.gh'
  const now = new Date()

  return [
    { url: baseUrl,                  lastModified: now, priority: 1.0 },
    { url: `${baseUrl}/riders`,      lastModified: now, priority: 0.9 },
    { url: `${baseUrl}/stations`,    lastModified: now, priority: 0.9 },
    { url: `${baseUrl}/about`,       lastModified: now, priority: 0.7 },
    { url: `${baseUrl}/contact`,     lastModified: now, priority: 0.7 },
    { url: `${baseUrl}/privacy`,     lastModified: now, priority: 0.5 },
    { url: `${baseUrl}/terms`,       lastModified: now, priority: 0.5 },
  ]
}
