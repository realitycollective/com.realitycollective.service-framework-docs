---
sidebar_position: 8
---

# Roadmap

***Last updated - 15 September 2026***

The web framework is in preview: `1.0.1-preview.8` on npm under the `preview` tag, published from the `development` branch. The `main` branch publishes `latest`.

:::info

Work is tracked in the [TypeScript repository](https://github.com/realitycollective/com.realitycollective.service-framework.ts/issues), and every release is listed in its [changelog](https://github.com/realitycollective/com.realitycollective.service-framework.ts/blob/development/CHANGELOG.md).

:::

## What is in place

The core and its host bindings ship with the investment areas the [design](../features/design_and_decisions.md) committed to:

- strict diagnostics for duplicate registration and missing services
- async resolution and initialization waiting
- scheduler-backed lifecycle routing
- multi-registration support by token and service name
- circular dependency detection before construction
- tests with 100% coverage thresholds
- host bindings for React, three.js, Babylon.js and Meta IWSDK, sharing one `RuntimeAdapter` contract with a published set of contract cases so a new host adapter can prove it behaves the same

## Under consideration

- **Portable scene content.** Scene content (meshes, prefabs, placement) is built by the app, ideally behind a factory interface the app owns. A shared content descriptor will be considered only when a second host is actually targeted; Meta's `iwsdk.scene.v1` format is an acceptable authoring interchange in the meantime.
- **Leaving preview.** Moving from `preview` to `latest` once the host adapter contract has settled across all four bindings.

## Not planned

- Engine features. The framework is dependency injection and platform-driven service hooks; rendering, input handling and interactions belong to the app or to the sibling WebXR packages, never to the framework itself.

## More information

- [Design and decisions](../features/design_and_decisions.md)
- [Migrating from Unity](../features/migrating_from_unity.md)
