/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CLIENT DATA
 * ─────────────────────────────────────────────────────────────────────────────
 * Business-specific copy: name, phone, email, address, socials.
 * Imported by Header, Footer, Contact page, and Head/SEO components.
 *
 * No component should hardcode a business name or phone number —
 * everything comes from this file or brand.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const client = {
  name: 'Pittman Industrial Marketing, Inc.',
  email: 'info@pittmanindustrial.com',
  phoneForTel: '205-916-2828',
  phoneFormatted: '(205) 916-2828',
  /** Business / contractor license number. Displayed in the header and footer
   *  as a trust signal. Set to an empty string to hide it. */
  license: 'Lic# 123456',
  address: {
    lineOne: '335 Industrial Lane',
    lineTwo: '',
    city: 'Birmingham',
    state: 'AL',
    zip: '35211',
    country: 'US',
    mapLink: 'https://maps.app.goo.gl/BTJ7nBajXekm9kCGA',
  },
  socials: {
    facebook: 'https://www.facebook.com/PittmanIndustrial',
    instagram: 'https://www.instagram.com/pittman_industrial/',
    linkedin: 'https://www.linkedin.com/company/pittman-industrial-marketing-inc-/',
    youtube: 'https://youtube.com/@pittmanindustrialmarketing8330',
    twitter: 'https://x.com/Pittmansocial',
    google: 'https://share.google/Z7DUj1PC1npHnwkr7',
  },
  domain: 'https://www.pittmanindustrial.com',
} as const;

export type Client = typeof client;
