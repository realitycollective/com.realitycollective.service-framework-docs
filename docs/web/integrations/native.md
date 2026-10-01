---
sidebar_position: 7
sidebar_label: "Native"
---

# `@realitycollective/service-framework-native`

Native host bindings for the [Reality Collective TypeScript Service Framework](https://github.com/realitycollective/com.realitycollective.service-framework.ts).

A **native host** is a native XR app, such as an OpenXR app on Quest or a CompositorServices app on visionOS, that embeds a JavaScript engine. The app chooses its JavaScript engine when it is built. Hermes is one example: compact, and with no browser APIs. JavaScriptCore and V8 can be embedded the same way, and any engine that runs modern JavaScript and provides the host globals listed below will do. The app owns the session, the frame loop, rendering and physics, and hands JavaScript one object before it evaluates the bundle. This package gives services the same `RuntimeAdapter` seam the IWSDK, three.js and Babylon.js bindings give them, plus the byte I/O they need to read assets. Services written against `BaseService<TConfig>` do not change between web and native.

From 1.0.2.

## Tested on a headset

A native app built with this package passed on a Meta Quest 3 on 1 October 2026, played by a person and checked by its conformance suites. No known issues.

---

## The host object: `globalThis.__rcHost`

The native app installs one object, `globalThis.__rcHost`, before the bundle runs. Everything that crosses it is a plain value: a number, a string, an array, a plain object or a `Uint8Array`. The only functions that cross are listener callbacks, and every `on*` method returns an unsubscribe function.

This package reads the root members and the optional `io` slice, and the signal half of the `input` slice. Each other Reality Collective family reads its own slice through its own native package: `input` and `interactions` in `@realitycollective/native-interactions`, `ui` in `@realitycollective/native-uiextensions`, and `environment`, `audio`, `sensing` and `scenes` in `@realitycollective/native-environment`. Each family's docs describe its slice. Since the platform synchronisation of 28 September 2026 those packages run every rule their IWSDK binding runs and hand the host results: the host renders, measures and reports, and never places a window, decides a press or derives a capability. That is in Interactions, UI Extensions and Environment `0.1.1`.

### The root slice

```ts
interface NativeSessionInfo {
  readonly state: "none" | "idle" | "ready" | "synchronized" | "visible" | "focused" | "stopping" | "exiting";
  readonly extensions: readonly string[];      // e.g. "XR_EXT_hand_tracking"
  readonly systemHandTracking: boolean;
  readonly blendMode: EnvironmentBlendMode | null;   // "opaque" | "alpha-blend" | "additive" | null
  readonly features?: readonly string[];       // WebXR feature names the session enabled, e.g. "hand-tracking"
  readonly supportedModes?: readonly SessionMode[];   // modes the app can start; absent means both immersive modes
}

interface NativeIOHost {
  fetchBytes(url: string): Promise<Uint8Array>;
  gunzip(bytes: Uint8Array): Promise<Uint8Array>;
}

interface NativeInputSignals {
  onSourcesChanged(listener: () => void): () => void;   // a source arrived or left
  sample?(): readonly { readonly kind: string }[];       // the input slice's own sample(), read for source kinds
}

type NativeSessionRefusal = "unsupported" | "denied" | "error";

interface NativeHost {
  onFrame(callback: (timestampMs: number, deltaS: number) => void): () => void;   // after xrWaitFrame
  getSessionInfo(): NativeSessionInfo;
  onSessionChange(callback: (info: NativeSessionInfo) => void): () => void;
  requestSession(mode: SessionMode, optionsJson: string): void;
  endSession(): void;
  onSessionRefused?(callback: (reason: NativeSessionRefusal, detail?: string) => void): () => void;
  recentre?(): void;                                    // offset the app's reference space so the head's x, z and yaw become the origin
  readonly input?: NativeInputSignals;
  readonly io?: NativeIOHost;
}
```

`state` is the OpenXR `XrSessionState` name, or `"none"` before a session exists. `requestSession` takes the same `SessionMode` string every binding accepts and a JSON-encoded `SessionRequestOptions`; the answer arrives later through `onSessionChange`, not as a return value. Every member of `NativeHost` and `NativeSessionInfo` carries a comment in the package stating its units and meaning, what counts as live, what the blend mode must reflect and what each signal triggers, so a host is built from the contract rather than from a guess.

`features` lists the WebXR feature names the session enabled, such as `"hand-tracking"` and `"plane-detection"`, and the capabilities read it as the IWSDK adapter reads `enabledFeatures`. `input` is the Interactions family's `input` slice seen from this package: only `onSourcesChanged` and the source kinds are read here, so capabilities re-derive when a hand or controller arrives or leaves, as the IWSDK adapter re-derives on `inputsourceschange`. `onSessionRefused` is the app's way to say it will not start a requested session, with the reason a web binding would report; without it a refused request could only time out.

`supportedModes` is a fact the adapter reads to answer `session.isSupported(mode)`. When the app leaves it out, the adapter answers `true` for both immersive modes and `false` for `"inline"`. `recentre` is the app's side of `session.recentre()`. The app offsets its own reference space so the head's current x, z and yaw become the origin, and leaves `y` and everything else about the scene alone. The reference space the app should use is `SESSION_REFERENCE_SPACE`: an OpenXR stage space when the runtime has one, otherwise a local space with the floor offset the app applies itself. When the app provides no `recentre`, `session.recentre()` does nothing.

---

## Quick start

```ts
import { ServiceManager, TimerScheduler } from "@realitycollective/service-framework";
import { NativeRuntimeAdapter, createNativeHostIO } from "@realitycollective/service-framework-native";

const scheduler = new TimerScheduler();                            // needs setInterval, or pass setIntervalFn
const manager = new ServiceManager({ scheduler });
const adapter = new NativeRuntimeAdapter({ scheduler, manager });   // reads globalThis.__rcHost
const io = createNativeHostIO();                                    // HostIO over __rcHost.io
```

`manager` is the service manager whose focus and pause signals should follow the session; the adapter calls `emitFocusChange` and `emitPauseChange` on it, and `NativeFocusSink` names those two methods.

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
| `manager` | `NativeFocusSink` | none; without it no focus or pause signal is raised |

**Frames.** Every host frame reaches `onFrame` subscribers as a `FrameInfo`: `timestamp` in milliseconds, `delta` in seconds, and `frame`, the count from 1, exactly as `FrameInfo` is documented on every binding. Given a `scheduler`, the same frame also emits the `renderTick` channel with `source: "native"` and `deltaTime` in milliseconds, one tick per frame, counted from 1 on that same counter. That is the shape `renderTickContractCases()` checks on every binding.

**Focus.** Services tick only while the session is focused, as they do under the IWSDK bridge, which is the reference behaviour: a host frame outside the `"focused"` state reaches no frame listener and no `renderTick`, and does not advance the frame count. Given `manager`, the adapter emits `emitFocusChange(focused)` and `emitPauseChange({ paused: !focused })` on every change of focus. Before 1.0.2 a native app ticked its services while the headset was off the face.

### Capabilities

The adapter derives its `AdapterCapabilities` from the session info, the same way the web adapters derive them from a WebXR session:

| Flag | Derived from |
| --- | --- |
| `immersive` | `state` is `"ready"`, `"synchronized"`, `"visible"` or `"focused"`; a session in the OpenXR `ready` state is live, as the session facet already read it |
| `handTracking` | live, and any of: `"hand-tracking"` is in `features`; `systemHandTracking` is true and `"XR_EXT_hand_tracking"` is in `extensions`; a hand is among the `input` slice's sources |
| `planeDetection` | live and `"plane-detection"` is in `features` |
| `passthrough` | live and `blendMode` is present and is not `"opaque"` |
| `environmentBlendMode` | `blendMode` while live, otherwise `null` |

The adapter re-derives on every `onSessionChange` and on the `input` slice's `onSourcesChanged`, and notifies subscribers only when a flag changes, as the IWSDK adapter does. `adapter.setCapabilities({ ... })` is a sticky override, the same rule every adapter follows: an override wins for as long as it is set, survives every later derivation, and is dropped only by `clearCapabilityOverrides()` or `dispose()`. `refreshCapabilities()` re-reads `getSessionInfo()` and re-derives on demand.

### Sessions

`adapter.session.request(mode, options)` sends `options` to the host as JSON through `requestSession` and resolves once `onSessionChange` reports a live state, or `{ ok: false, reason: "timeout" }` after `options.timeoutMs` (default 10000). A host that installs `onSessionRefused` can answer at once instead: the request then resolves with the app's own reason, `"unsupported"`, `"denied"` or `"error"`, so a dismissed permission prompt reads as `denied` rather than waiting ten seconds for a timeout. `end()` calls `endSession()` and resolves once the host reports `"none"`.

`session.getMode()` returns the mode this adapter requested while that session is live, and `null` otherwise. `session.isSupported(mode)` answers from `supportedModes` and never rejects. Asking for the mode that is already active does nothing and resolves `{ ok: true }`. Asking for a different mode is end-and-request: the adapter calls `endSession()`, waits for the session to go away, then calls `requestSession` as for an ordinary request, so the app sees no session in the way. An app that cannot end its own session reports `onSessionRefused("unsupported")`, and the request resolves `{ ok: false, reason: "unsupported" }` rather than losing the refusal. A session the adapter did not request, such as one already live at construction, has no known mode, so a request against it is treated as a switch.

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
| `NativeRuntimeAdapterOptions` | interface | `{ host?, scheduler?, manager? }`. |
| `NativeFocusSink` | interface | The two methods `manager` needs: `emitFocusChange` and `emitPauseChange`. |
| `createNativeHostIO` | function | Returns a `HostIO` over `__rcHost.io`. |
| `NativeHost` / `NativeIOHost` / `NativeSessionInfo` / `NativeInputSignals` / `NativeSessionRefusal` | types | The structural shape of `globalThis.__rcHost`. |

---

## Running tests

From the workspace root:

```bash
npm test
```

The tests run against an in-memory fake of `__rcHost` (`test/helpers/fake-native-host.ts`), so no device or embedded engine is needed to develop this package.

## Running the conformance suites on device

Every case in `runtimeAdapterContractCases()`, `renderTickContractCases()` and `hostIOContractCases()` is runner-free: it throws a plain `Error` on failure and returns otherwise, so a native app can run the same suites in its embedded engine on a headset with no test framework at all. See [conformance suites](../features/conformance_suites.md) for the loop.

The native harness in `harness/native` of the framework repository is a small app that runs these suites on a headset. In `kits` mode it runs the three shared suites over `NativeRuntimeAdapter` and `createNativeHostIO`, and boots a profile with no global `AbortController`. In `play` mode it logs session, visibility, pause, focus, capability and telemetry changes from the live host and reads a packed file through `HostIO`, while a person sees a board of live services in the headset. The harness is compiled by CI and never run there. Each family's native package ships a host conformance kit for the same device run; see [conformance suites](../features/conformance_suites.md).

## More information

- [Native as a platform](https://www.realitycollective.net/webxr/docs/concepts/native-platform), the host object across every WebXR family
- [Interactions: native](https://www.realitycollective.net/webxr/docs/interactions/integrations/native), the `input` and `interactions` slices
- [UI Extensions: native](https://www.realitycollective.net/webxr/docs/uiextensions/integrations/native), the `ui` slice
- [Environment: native](https://www.realitycollective.net/webxr/docs/environment/integrations/native), the `environment`, `audio`, `sensing` and `scenes` slices
- [Conformance suites](../features/conformance_suites.md) and [`HostIO`](../features/host_io.md)

## License

MIT
