/**
 * Open-Source-Komponenten, die in kiezquiz.de eingebunden sind.
 * Zweck-Texte: legalPages.licenses.components.<id> in de.json / en.json
 */
window.KIEZ_OSS_LICENSES = {
  runtime: [
    {
      id: 'supabase-js',
      name: '@supabase/supabase-js',
      version: '2.x',
      license: 'MIT',
      licenseUrl: 'https://github.com/supabase/supabase-js/blob/master/LICENSE',
      projectUrl: 'https://github.com/supabase/supabase-js',
      delivery: 'jsDelivr CDN (npm)'
    }
  ],
  fonts: [
    {
      id: 'bricolage',
      name: 'Bricolage Grotesque',
      license: 'SIL Open Font License 1.1',
      licenseUrl: 'https://openfontlicense.org',
      projectUrl: 'https://fonts.google.com/specimen/Bricolage+Grotesque',
      delivery: 'self-hosted (/assets/fonts/)'
    },
    {
      id: 'hanken',
      name: 'Hanken Grotesk',
      license: 'SIL Open Font License 1.1',
      licenseUrl: 'https://openfontlicense.org',
      projectUrl: 'https://fonts.google.com/specimen/Hanken+Grotesk',
      delivery: 'self-hosted (/assets/fonts/)'
    },
    {
      id: 'space-mono',
      name: 'Space Mono',
      license: 'SIL Open Font License 1.1',
      licenseUrl: 'https://openfontlicense.org',
      projectUrl: 'https://fonts.google.com/specimen/Space+Mono',
      delivery: 'self-hosted (/assets/fonts/)'
    }
  ],
  development: [
    {
      id: 'http-server',
      name: 'http-server',
      version: 'via npx',
      license: 'MIT',
      licenseUrl: 'https://github.com/http-party/http-server/blob/master/LICENSE',
      projectUrl: 'https://github.com/http-party/http-server',
      delivery: 'local dev only'
    }
  ]
};
