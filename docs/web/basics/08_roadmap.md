---
sidebar_position: 8
---

# Roadmap

***Last updated - 1 October 2026***

The web framework is released: `1.0.2` on npm under `latest`, published from `main`. It adds the native binding, the focus gate on every binding, session modes and recentring, and the byte I/O helpers.

The `development` branch publishes previews of the next version under the `preview` tag. Previews are not supported.

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
- host bindings for React, three.js, Babylon.js, Meta IWSDK and a native XR app embedding a JavaScript engine such as Hermes
- one `RuntimeAdapter` contract, one `renderTick` contract and one `HostIO` contract shared by every binding, each with published contract cases so a new binding can prove it behaves the same
- session modes and recentring on every binding: one reference space, `getMode`, `isSupported` and `recentre`, and a mode switch that ends the live session first
- one behaviour on every platform, with the IWSDK binding as the reference: services tick only while the session is focused, focus and pause are raised for you from the session, and every frame carries the same frame count on `FrameInfo.frame` and `renderTick`, on IWSDK, three.js, Babylon.js and native alike

- a native app built with the native binding passed on a Meta Quest 3 on 1 October 2026, played by a person and checked by its conformance suites, with no known issues

## Under consideration

- **Google XR Blocks.** An XR Blocks app owns its own loop, so it drives `WebXRRuntimeAdapter.tick()` by hand from its per-frame hook rather than calling `start()`. That path passes the same suites as the owned loop; a binding package of its own is not planned while the three.js one serves it.

## Known platform differences

- Only the IWSDK binding translates WebXR feature strings into IWSDK's structured feature options and reports the ones it cannot map. The three.js, Babylon.js and native bindings pass the strings through to their host, so there is nothing to translate there.

## Not planned

- Engine features. The framework is dependency injection and platform-driven service hooks; rendering, input handling and interactions belong to the app or to the sibling WebXR packages, never to the framework itself.
- Scene content. Meshes, prefabs and placement are the app's; loading and switching scenes is the WebXR Environment family's scene manager, not this framework.

## More information

- [Design and decisions](../features/design_and_decisions.md)
- [Migrating from Unity](../features/migrating_from_unity.md)
