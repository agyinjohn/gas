# GetGas Website

Marketing website for GetGas — LPG delivery platform built with Next.js 14 (App Router), Tailwind CSS, TypeScript, and static export.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — hero, how it works, features, download, coverage, testimonials |
| `/riders` | For Riders — earn, requirements, how to join |
| `/stations` | For Stations — grow sales, commission model |
| `/about` | About — mission, values, timeline |
| `/contact` | Contact — WhatsApp, email, support form |
| `/privacy` | Privacy Policy (13 sections — required for Google Play) |
| `/terms` | Terms of Service (12 sections) |

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
# → http://localhost:3000

# 3. Build static export
npm run build
# → /out directory (ready to upload to Vercel / Netlify)
```

## Deploy to Vercel (recommended)

1. Push this repo to GitHub
2. Go to https://vercel.com/new and import the repo
3. Framework preset: **Next.js**
4. All defaults work — click Deploy

Your privacy policy will be live at `https://your-domain.com/privacy` — submit this URL to Google Play.

## Customisation checklist

- [ ] Replace `https://app.getgas.com.gh` with your real web app URL (Navbar, Home hero, Home CTA)
- [ ] Replace `https://wa.me/233XXXXXXXXX` with your real WhatsApp number
- [ ] Replace `hello@getgas.com.gh` / `privacy@getgas.com.gh` with real emails
- [ ] Replace Play Store link in Home download section
- [ ] Add real QR code image in Home download section
- [ ] Update `sitemap.ts` baseUrl with your actual domain
- [ ] Wire the contact form to a backend (Formspree, EmailJS, or custom API)
- [ ] Add real OG image at `public/og-image.png` (1200×630px)
- [ ] Add favicon at `public/favicon.ico`

## Brand tokens

| Token | Value |
|-------|-------|
| Brand orange | `#E87722` |
| Dark | `#1A1A1A` |
| Background gray | `#F5F5F5` |
| Muted text | `#6B7280` |
| Display font | Sora |
| Body font | DM Sans |

## Tech stack

- **Next.js 14** — App Router, static export (`output: 'export'`)
- **Tailwind CSS** — utility-first styling
- **TypeScript** — full type safety
- **lucide-react** — icons
- **Google Fonts** — Sora + DM Sans (loaded via CSS @import)
