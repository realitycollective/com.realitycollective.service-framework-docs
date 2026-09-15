# Service Framework Documentation

This repository contains the Service Framework documentation website found at:

[https://serviceframework.realitycollective.net/](https://serviceframework.realitycollective.net/)

## Contributing

If you want to contribute to documentation of the framework please target your PR against the `main` branch.

## Site structure

- `docs/index.md` is the overview: what the framework is, and the two platforms it ships for.
- `docs/unity/` is the Unity (C#) documentation. Its pages kept their old URLs through client-side redirects in `docusaurus.config.ts`.
- `docs/web/` is the Web (TypeScript) documentation, organised like the Unity section: `basics/` mirrors the Unity basics page for page, `features/` holds logging, migration and design, `integrations/` has one page per npm package, and the weather client walkthrough sits at the root.
- `api-docs/` is the generated API reference for both platforms (not committed; see below).

Each of `unity` and `web` has its own sidebar in `sidebars.ts`, generated from its folder.

## Running the site locally

Requires Node 20 or newer, git, and the .NET SDK (8 or newer) for the C# API reference.

The quickest check is the one-shot script. It installs dependencies, clones the two framework repositories into `.sources/`, generates both API references into `api-docs/`, builds the site and serves it on http://localhost:3000. Everything stays inside this folder.

```bash
npm run local                  # full run, then serves ./build
npm run local -- --dev         # full run, then the hot-reloading dev server
npm run local -- --no-serve    # full run, no server (what CI does)
npm run local -- --skip-fetch  # reuse the existing .sources checkouts
npm run local -- --skip-cs     # skip the C# reference (no dotnet needed)
```

The individual steps are also available:

```bash
npm ci
npm run api:fetch    # clone or update the framework repos listed in api-sources.json
npm run api:ts       # TypeScript reference (TypeDoc)
npm run api:cs       # C# reference (DocFX, restored as a dotnet local tool)
npm run api:index    # API landing page
npm run api          # all four of the above
npm run api:clean    # remove api-docs/
npm start            # dev server; works with or without api-docs/
npm run build        # production build, fails on broken links
npm run serve        # serve ./build
```

## Choosing which framework version to document

`api-sources.json` pins a repository and a ref (branch, tag or commit) for each dependency: the C# framework, the C# utilities package it depends on, and the TypeScript framework. Those are the defaults for CI and for `npm run local`. Change the file to move the published site to a new version.

For a one-off run against another branch, pass the ref on the command line or through the environment:

```bash
npm run local -- --ts-ref=feature/scheduler-rework
npm run local -- --cs-ref=v2.0.0-pre.1 --utilities-ref=main
SF_TS_REF=feature/scheduler-rework npm run api        # same thing, step by step
```

To document an uncommitted local checkout instead, point the tool at the folder. Nothing is fetched for that dependency:

```bash
npm run local -- --ts-dir=../com.realitycollective.service-framework.ts
npm run local -- --cs-dir=../com.realitycollective.service-framework
```

The variables are `SF_CS_REF`, `SF_CS_UTILITIES_REF`, `SF_TS_REF` and `SF_CS_DIR`, `SF_CS_UTILITIES_DIR`, `SF_TS_DIR`. The `Test deployment` workflow exposes the same three refs as inputs when run manually from the Actions tab, so a branch can be validated in CI before the pin is changed. The API landing page records which ref and commit each section was generated from.

## API reference

The API section is generated at build time and is not committed. Pages are produced from the XML doc comments (C#) and TSDoc comments (TypeScript) in the framework source, so improvements belong in those repositories. The generators print a summary of anything the source needs fixing (unresolved types, invalid `<see cref>` values, malformed comments); the full DocFX log is written to `api-docs/docfx.log`.

The C# framework references `UnityEngine`, `UnityEditor` and the ugui package. When a Unity editor is installed through Unity Hub, the generator finds it (preferring the version in the framework's `package.json`) and compiles against its assemblies and package sources, so every type resolves. Set `SF_UNITY_DIR` to an editor folder to choose one explicitly, or to `none` to skip. CI runners have no Unity, so there DocFX runs with compilation errors allowed and Unity types render as plain text rather than links; the framework's own API is unaffected.

## Previewing a pull request

Every pull request runs the `Test deployment` workflow. It generates the API reference, builds the site and uploads the `build` folder as an artifact named `site-pr-<number>`. The workflow leaves a comment on the PR with a link to the artifact. Download it, unzip it and run `npx serve -s build` to browse the exact output the PR would publish.

## Build Status

Whenever a PR is merged to the `main` branch the docs are updated and published right away.

![main](https://github.com/realitycollective/com.realitycollective.service-framework-docs/actions/workflows/deploy.yml/badge.svg?branch=main)

© Reality Collective 2025
