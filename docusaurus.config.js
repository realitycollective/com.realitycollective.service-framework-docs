// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Service Framework',
  tagline: 'Official documentation for the Service Framework by the Reality Collective',
  url: 'https://serviceframework.realitycollective.net/',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'realitycollective',
  projectName: 'com.realitycollective.service-framework-docs',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/realitycollective/com.realitycollective.service-framework-docs/edit/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Service Framework',
        logo: {
          alt: 'Reality Collective',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'get-started',
            position: 'left',
            label: 'Documentation',
          },
          {
            type: 'doc',
            docId: 'unity6-performance-improvements',
            position: 'left',
            label: 'Unity 6 Improvements',
          },          
          {
            href: 'https://discord.gg/YjHAQD2XT8',
            label: 'Join Us On Discord',
            position: 'left',
          },
          {
            href: 'https://github.com/realitycollective/com.realitycollective.service-framework',
            label: 'GitHub',
            position: 'right',
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
                label: 'Get Started',
                to: '/docs/get-started',
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
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
