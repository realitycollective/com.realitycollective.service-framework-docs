import fs from 'node:fs';
import path from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config, PluginConfig} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// The API reference is generated into api-docs/ by `npm run api` (see api-sources.json and scripts/).
// The folder is gitignored, so the section only exists on builds that ran the generators (CI does).
const hasApiDocs = fs.existsSync(path.resolve(__dirname, 'api-docs', 'index.md'));
const apiDocsPlugin: PluginConfig = [
  '@docusaurus/plugin-content-docs',
  {
    id: 'api',
    path: 'api-docs',
    routeBasePath: 'api',
    sidebarPath: './api-sidebars.ts',
    showLastUpdateTime: false,
  },
];

const config: Config = {
  title: 'Service Framework',
  tagline: 'One service model for Unity and the web, by the Reality Collective',
  favicon: 'img/favicon.ico',

  url: 'https://serviceframework.realitycollective.net/',
  baseUrl: '/',

  organizationName: 'realitycollective',
  projectName: 'com.realitycollective.service-framework-docs',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Space Grotesk for headings and IBM Plex Sans for body, the pairing from the homepage design.
  stylesheets: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
      type: 'text/css',
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        // The Unity pages lived at the docs root before the site gained the web section.
        // These URLs are linked from the C# README and OpenUPM, so they must keep working.
        redirects: [
          {from: '/docs', to: '/overview'},
          {from: '/docs/get-started', to: '/docs/unity/get-started'},
          {from: '/docs/unity6-performance-improvements', to: '/docs/unity/unity6-performance-improvements'},
          ...[
            'introduction',
            'getting_started',
            'service_design',
            'advanced_services',
            'service_patterns',
            'scene_based_service_manager',
            'dependency-injection',
            'roadmap',
          ].map((slug) => ({from: `/docs/basics/${slug}`, to: `/docs/unity/basics/${slug}`})),
          ...['platform_system', 'package_installer'].map((slug) => ({
            from: `/docs/features/${slug}`,
            to: `/docs/unity/features/${slug}`,
          })),
        ],
      },
    ],
    ...(hasApiDocs ? [apiDocsPlugin] : []),
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/realitycollective/com.realitycollective.service-framework-docs/edit/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Service Framework',
      logo: {
        alt: 'Reality Collective',
        src: 'img/logo.png',
      },
      items: [
        {
          to: '/overview',
          position: 'left',
          label: 'Overview',
        },
        {
          type: 'docSidebar',
          sidebarId: 'unity',
          position: 'left',
          label: 'Unity (C#)',
        },
        {
          type: 'docSidebar',
          sidebarId: 'web',
          position: 'left',
          label: 'Web (TypeScript)',
        },
        ...(hasApiDocs
          ? [
              {
                type: 'docSidebar' as const,
                docsPluginId: 'api',
                sidebarId: 'api',
                position: 'left' as const,
                label: 'API',
              },
            ]
          : []),
        {
          href: 'https://discord.gg/YjHAQD2XT8',
          label: 'Discord',
          position: 'right',
        },
        {
          type: 'dropdown',
          label: 'GitHub',
          position: 'right',
          items: [
            {
              label: 'Unity (C#) framework',
              href: 'https://github.com/realitycollective/com.realitycollective.service-framework',
            },
            {
              label: 'Web (TypeScript) framework',
              href: 'https://github.com/realitycollective/com.realitycollective.service-framework.ts',
            },
            {
              label: 'This documentation',
              href: 'https://github.com/realitycollective/com.realitycollective.service-framework-docs',
            },
          ],
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Overview',
              to: '/overview',
            },
            {
              label: 'Unity (C#)',
              to: '/docs/unity/get-started',
            },
            {
              label: 'Web (TypeScript)',
              to: '/docs/web/get-started',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/YjHAQD2XT8',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/realitytoolkit',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              href: 'https://www.realitycollective.net/blog',
            },
            {
              label: 'Reality Collective Website',
              href: 'https://www.realitycollective.net/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/realitycollective/com.realitycollective.service-framework',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Reality Collective. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      // C# is not in the default Prism bundle; the docs are almost entirely C# samples.
      additionalLanguages: ['csharp', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
