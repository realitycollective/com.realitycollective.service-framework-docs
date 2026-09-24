---
sidebar_position: 7
sidebar_label: "Native"
---

# `@realitycollective/service-framework-native`

Native host bindings for the [Reality Collective TypeScript Service Framework](https://github.com/realitycollective/com.realitycollective.service-framework.ts).

A **native host** is a native XR app, such as an OpenXR app on Quest or a CompositorServices app on visionOS, that embeds a JavaScript engine. The app chooses its JavaScript engine when it is built. Hermes is one example: compact, and with no browser APIs. JavaScriptCore and V8 can be embedded the same way, and any engine that runs modern JavaScript and provides the host globals listed below will do. The app owns the session, the frame loop, rendering and physics, and hands JavaScript one object before it evaluates the bundle. This package gives services the same `RuntimeAdapter` seam the IWSDK, three.js and Babylon.js bindings give them, plus the byte I/O they need to read assets. Services written against `BaseService<TConfig>` do not change between web and native.

From 1.0.2 (preview).

---

## The host object: `globalThis.__rcHost`

The native app installs one object, `globalThis.__rcHost`, before the bundle runs. Everything that crosses it is a plain value: a number, a string, an array, a plain object or a `Uint8Array`. The only functions that cross are listener callbacks, and every `on*` method returns an unsubscribe function.

This package reads the root members and the optional `io` slice. Each other Reality Collective family reads its own slice through its own native package: `input` and `interactions` in `@realitycollective/native-interactions`, `ui` in `@realitycollective/native-uiextensions`, and `environment`, `audio` and `sensing` in `@realitycollective/native-environment`.

### The root slice

```ts
interface NativeSessionInfo {
  readonly state: "none" | "idle" | "ready" | "synchronized" | "visible" | "focused" | "stopping" | "exiting";
  readonly extensions: readonly string[];      // e.g. "XR_EXT_hand_tracking"
  readonly systemHandTracking: boolean;
  readonly blendMode: EnvironmentBlendMode | null;   // "opaque" | "alpha-blend" | "additive" | null
}

interface NativeIOHost {
  fetchBytes(url: string): Promise<Uint8Array>;
  gunzip(bytes: Uint8Array): Promise<Uint8Array>;
}

interface NativeHost {
  onFrame(callback: (timestampMs: number, deltaS: number) => void): () => void;   // after xrWaitFrame
  getSessionInfo(): NativeSessionInfo;
  onSessionChange(callback: (info: NativeSessionInfo) => void): () => void;
  requestSession(mode: SessionMode, optionsJson: string): void;
  endSession(): void;
  readonly io?: NativeIOHost;
}
```

`state` is the OpenXR `XrSessionState` name, or `"none"` before a session exists. `requestSession` takes the same `SessionMode` string every binding accepts and a JSON-encoded `SessionRequestOptions`; the answer arrives later through `onSessionChange`, not as a return value.

---

## Quick start

```ts
import { ServiceManager, TimerScheduler } from "@realitycollective/service-framework";
import { NativeRuntimeAdapter, createNativeHostIO } from "@realitycollective/service-framework-native";

const scheduler = new TimerScheduler();                   // needs setInterval, or pass setIntervalFn
const adapter = new NativeRuntimeAdapter({ scheduler });   // reads globalThis.__rcHost
const io = createNativeHostIO();                           // HostIO over __rcHost.io

const manager = new ServiceManager({ scheduler });
```

Pass `host` to use an injected object instead of the global, as the package's own tests do:

```ts
const adapter = new NativeRuntimeAdapter({ host: myFakeHost, scheduler });
```

---

## `NativeRuntimeAdapter`

`NativeRuntimeAdapter` implements `RuntimeAdapter` with the session facet, and passes the shared `runtimeAdapterContractCases()`, the same conformance suite the IWSDK, three.js and Babylon.js adapters pass. See [conformance suites](../features/conformance_suites.md).

**Options** (`NativeRuntimeAdapterOptions`):

| Option | Type | Default |
| --- | --- | --- |
| `host` | `NativeHost` | `globalThis.__rcHost` |
| `scheduler` | `IScheduler` | none |

**Frames.** Every host frame reaches `onFrame` subscribers as a `FrameInfo`: `timestamp` in milliseconds, `delta` in seconds, exactly as `FrameInfo` is documented on every binding. Given a `scheduler`, the same frame also emits the `renderTick` channel with `source: "native"` and `deltaTime` in milliseconds, one tick per frame, counted from 1. That is the shape `renderTickContractCases()` checks on every binding.

### Capabilities

The adapter derives its `AdapterCapabilities` from the session info, the same way the web adapters derive them from a WebXR session:

| Flag | Derived from |
| --- | --- |
| `immersive` | `state` is `"synchronized"`, `"visible"` or `"focused"` |
| `handTracking` | live, and `systemHandTracking` is true, and `"XR_EXT_hand_tracking"` is in `extensions` |
| `planeDetection` | always `false`, because the session info carries no equivalent flag |
| `passthrough` | live and `blendMode` is present and is not `"opaque"` |
| `environmentBlendMode` | `blendMode` while live, otherwise `null` |

`adapter.setCapabilities({ ... })` is a sticky override, the same rule every adapter follows: an override wins for as long as it is set, survives every later derivation, and is dropped only by `clearCapabilityOverrides()` or `dispose()`. `refreshCapabilities()` re-reads `getSessionInfo()` and re-derives on demand.

### Sessions

`adapter.session.request(mode, options)` sends `options` to the host as JSON through `requestSession` and resolves once `onSessionChange` reports a live state, or `{ ok: false, reason: "timeout" }` after `options.timeoutMs` (default 10000). `end()` calls `endSession()` and resolves once the host reports `"none"`.

OpenXR states map onto the shared `SessionVisibility` vocabulary: `"focused"` is `"visible"`, `"visible"` is `"visible-blurred"`, `"synchronized"` is `"hidden"`, and anything else is `"non-immersive"`.

`dispose()` drops the host subscriptions and settles any request or `end()` still in flight. It does not end the session; the app owns that decision.

---

## Byte I/O: the `io` slice

A bare engine like Hermes has no `fetch` and no `DecompressionStream`, so it cannot use the core's `createWebHostIO()`. `createNativeHostIO(host?)` returns the core's `HostIO` interface over `__rcHost.io` instead, and throws if the host installed no `io` slice. Code written against `HostIO`, including the core's `fetchText`, `fetchJson` and `fetchMaybeGzipped` helpers, runs unchanged on both hosts. See [`HostIO`](../features/host_io.md) for the full interface and the asset transparency rule.

---

## Host globals the embedded engine must provide

Beyond `globalThis.__rcHost`, the core needs a short list of globals from the engine, documented in full in the core package README's "Host requirements" section:

- `setTimeout` and `clearTimeout`, used by `ServiceManager.resolveAsync`, `waitUntilInitialized` and the mock adapter's session request
- `setInterval` and `clearInterval`, used by `TimerScheduler` unless you pass `setIntervalFn` and `clearIntervalFn` yourself
- on React Native's build of Hermes, `setImmediate`, needed for promise jobs to drain

`AbortController` is no longer required. `ServiceManager` uses the host's `AbortController` when present and falls back to a small built-in one otherwise, so an engine that lacks it still boots every service profile.

---

## The public surface rule

Like every other binding, this package exports only what a consumer needs to construct and drive the adapter. At runtime that is exactly `NativeRuntimeAdapter` and `createNativeHostIO`. Reading the global and deriving capabilities stay internal. The structural types below are exported for anyone typing a host or a test fake by hand.

| Symbol | Kind | Purpose |
| --- | --- | --- |
| `NativeRuntimeAdapter` | class | `RuntimeAdapter` over `globalThis.__rcHost`; `onFrame`, `getCapabilities`, `onCapabilitiesChange`, `setCapabilities`, `clearCapabilityOverrides`, `refreshCapabilities`, `session`, `dispose`. |
| `NativeRuntimeAdapterOptions` | interface | `{ host?, scheduler? }`. |
| `createNativeHostIO` | function | Returns a `HostIO` over `__rcHost.io`. |
| `NativeHost` / `NativeIOHost` / `NativeSessionInfo` | types | The structural shape of `globalThis.__rcHost`. |

---

## Running tests

From the workspace root:

```bash
npm test
```

The tests run against an in-memory fake of `__rcHost` (`test/helpers/fake-native-host.ts`), so no device or embedded engine is needed to develop this package.

## Running the conformance suites on device

Every case in `runtimeAdapterContractCases()`, `renderTickContractCases()` and `hostIOContractCases()` is runner-free: it throws a plain `Error` on failure and returns otherwise, so a native app can run the same suites in its embedded engine on a headset with no test framework at all. See [conformance suites](../features/conformance_suites.md) for the loop.

:::warning Status
Only the root slice, which carries frames, session state and capabilities, has run on real hardware: on a Quest 3 and in the visionOS Simulator. The `io` slice and every other family's native slice are tested headless, against in-memory fakes of `__rcHost`, and have not yet been proven on a device.
:::

## More information

- [Native as a platform](https://www.realitycollective.net/webxr/docs/concepts/native-platform), the host object across every WebXR family
- [Interactions: native](https://www.realitycollective.net/webxr/docs/interactions/integrations/native), the `input` and `interactions` slices
- [UI Extensions: native](https://www.realitycollective.net/webxr/docs/uiextensions/integrations/native), the `ui` slice
- [Environment: native](https://www.realitycollective.net/webxr/docs/environment/integrations/native), the `environment`, `audio` and `sensing` slices
- [Conformance suites](../features/conformance_suites.md) and [`HostIO`](../features/host_io.md)

## License

MIT
