---
sidebar_position: 6
---

# Host runtimes and schedulers

The core package has no loop and no knowledge of the browser, a renderer or a headset. Something has to feed it frames, visibility and, for XR, a session. That something is a host binding. This page explains the two seams a binding plugs into, which binding drives what, and how a service reaches host-specific features without depending on the host.

## Overview

There are two seams, both defined in the core package:

1. **The scheduler.** Named channels (`tick`, `renderTick`, `focusChange` and so on) that the manager forwards to every service as lifecycle calls. A binding emits on these channels from the host's own loop.
2. **`RuntimeAdapter`.** An interface a service can depend on to reach the host directly: per-frame callbacks, XR capability flags, and an optional session facet. Each binding ships an adapter that implements it; the core ships `MockRuntimeAdapter` for tests.

The split between the two is firm. The core defines the scheduler channels and `BaseService`. A binding emits `renderTick` from its own loop and, where it follows a session, raises focus and pause. It never emits `update`, `lateUpdate` or `fixedUpdate`. Those fire only from the core's `TimerScheduler`. Host hooks such as capabilities and the session reach a service through `RuntimeAdapter`.

Services never import a host package. They implement lifecycle methods from `BaseService`, and when they need the host, they take a `RuntimeAdapter` through their configuration or a dependency.

## Which host drives which channel

| Host | Package | Emits `renderTick` | Emits `tick` / `lateTick` / `fixedTick` | Emits `focusChange` / `pauseChange` |
| --- | --- | --- | --- | --- |
| Plain browser, `TimerScheduler` | core | only if `requestAnimationFrameFn` is passed | yes, from timers | no |
| Plain browser, `ManualScheduler` | core | no | no | no |
| React | `service-framework-react` | no | no | no |
| three.js | `service-framework-three` | yes, `source: "three"`; while a session is live, only while it is visible | no | yes, from the session's visibility, when given a `manager` |
| Babylon.js | `service-framework-babylon` | yes, `source: "babylon"`; while a session is live, only while it is visible | no | yes, from the session's visibility, when given a `manager` |
| Meta IWSDK | `service-framework-iwsdk` | yes, `source: "iwsdk"`, only while visible | no | yes, from the world's visibility |
| Native (embedded JavaScript engine) | `service-framework-native` | yes, `source: "native"`, when given a `scheduler`, only while the session is focused | no | yes, from the session's focus, when given a `manager` |
| Client (React + three) | `service-framework-client` | yes, through the three.js bridge | no | no |

Three things follow from this table:

- On a renderer host, per-frame work belongs in `render()`. `update()` does not fire unless you also use a `TimerScheduler`.
- The schedulers compose. `TimerScheduler` extends `ManualScheduler`, so one manager can have timers driving `tick` and a bridge driving `renderTick`.
- Every adapter that follows a live XR session raises focus and pause for you, and feeds no frame while the session is not visible: `IWSDKAdapter` always, and `WebXRRuntimeAdapter`, `BabylonRuntimeAdapter` and `NativeRuntimeAdapter` when given the `manager` option. That is one rule, taken from the IWSDK bridge and applied on every binding from 1.0.2. A desktop page with no session is never gated, so there focus and pause are still yours to raise. Wire the browser's visibility to the manager once and every service gets `onFocusChange` and `onPauseChange`:

```ts
document.addEventListener("visibilitychange", () => {
  const focused = document.visibilityState === "visible";
  manager.emitFocusChange(focused);
  manager.emitPauseChange({ paused: !focused });
});
```

## Bridges and adapters

Each renderer binding offers two ways in, and you use one or the other for the loop, never both:

- A **bridge** (`ThreeRenderLoopBridge`, `BabylonRenderLoopBridge`) does one thing: it hooks the renderer's frame callback and emits `renderTick`. Use it when your app only needs `render()`.
- An **adapter** (`WebXRRuntimeAdapter`, `BabylonRuntimeAdapter`, `IWSDKAdapter`) implements `RuntimeAdapter`. Given the renderer and a scheduler it also owns the loop and emits `renderTick`, so it replaces the bridge. Use it when services need XR capabilities or session control.

## The `RuntimeAdapter` seam

`RuntimeAdapter` is how host-specific hooks reach a service through a core interface. It has three parts:

| Member | What it gives a service |
| --- | --- |
| `onFrame(listener)` | a per-frame callback with `{ timestamp, delta, frame }`; `delta` is in seconds here, unlike the scheduler's millisecond `deltaTime`, and `frame` is the same count `renderTick` carries for that frame, from 1, on every binding (from 1.0.2) |
| `getCapabilities()` and `onCapabilitiesChange(listener)` | `{ immersive, handTracking, planeDetection, passthrough, environmentBlendMode }`, which change when a session starts or ends |
| `session` (optional) | `getState()`, `getMode()`, `isSupported(mode)`, `request(mode, options)`, `end()`, `recentre()`, `onStateChange`, `onVisibilityChange`; present only on hosts that own an XR session |

A service takes the adapter through its configuration and subscribes in `start()`:

```ts
import { BaseService, type RuntimeAdapter } from "@realitycollective/service-framework";

interface PassthroughConfig {
  readonly adapter: RuntimeAdapter;
}

export class PassthroughService extends BaseService<PassthroughConfig> {
  private stop: (() => void) | undefined;

  public override start(): void {
    const { adapter } = this.serviceConfig;
    this.apply(adapter.getCapabilities().passthrough);
    this.stop = adapter.onCapabilitiesChange((caps) => this.apply(caps.passthrough));
  }

  public override destroy(): void {
    this.stop?.();
  }

  private apply(passthrough: boolean): void {
    // dim the scene, swap materials, whatever passthrough needs
  }
}
```

The same class runs under three.js, Babylon.js, IWSDK or a native host, because every adapter implements the same interface and passes the same conformance suite (`runtimeAdapterContractCases()`). In a test, hand it a `MockRuntimeAdapter` and call `setCapabilities({ passthrough: true })`.

Session control goes through the facet when the host has one:

```ts
const result = await adapter.session?.request("immersive-ar", { requiredFeatures: ["hand-tracking"] });
if (result && !result.ok) {
  console.warn(`No session: ${result.reason}`);
}
```

`request` never throws; it resolves `{ ok: false, reason }` with `unsupported`, `denied`, `timeout` or `error`. The default timeout is 10 seconds; pass `timeoutMs` to change it.

### Session modes and recentring

Every binding requests the same reference space, `SESSION_REFERENCE_SPACE`, which is `"local-floor"`. Its origin is where the session began, +Y is up with the floor at y = 0, and -Z is the direction the viewer first faced. The constant is exported from the core so an app can name it instead of repeating the string.

Three members of the session facet work with modes.

- `getMode()` returns the mode of the live session, or `null` when there is none. It reports the mode this facet requested. A session the app adopted from outside the facet, such as one already running when the adapter was built or one started from the host's own UI, reports `null` even while live, because a WebXR session does not carry its mode.
- `isSupported(mode)` resolves whether the host could start `mode` now. It changes no state, starts nothing and never rejects. A host that cannot answer resolves `false`.
- `recentre()` makes the viewer's current position on the floor, and the direction the viewer faces, the new origin. Afterwards the viewer stands at x = 0 and z = 0 facing -Z. The height `y` is untouched and the floor stays the floor. It does nothing when there is no live session and never throws.

`request(mode)` follows one rule on every binding, called end-and-request. Asking for the mode that is already active does nothing and resolves `{ ok: true }`. Asking for a different mode ends the live session first and then requests the new one. The state walks `active`, `ending`, `none`, `requesting`, `active`, as calling `end()` and then `request()` would. A host that cannot end its own session resolves `{ ok: false, reason: "unsupported" }` and leaves the live session running. An app that swaps from `"immersive-vr"` to `"immersive-ar"` relies on this. Before 1.0.2 a request in a different mode while a session was active did nothing and resolved `{ ok: true }`, so code that depended on that must now expect the live session to end.

```ts
if (await adapter.session?.isSupported("immersive-ar")) {
  await adapter.session.request("immersive-ar"); // ends a live VR session first
}
adapter.session?.recentre();
```

The core also exports the two pure functions a binding uses for recentring, with the `RigidPose` type they share. A `RigidPose` is a position in metres, `[x, y, z]`, and a unit quaternion, `[x, y, z, w]`. `recentreOffset(viewer)` returns the transform to apply as a WebXR reference-space offset so the viewer lands at the origin facing -Z. `recentreRig(rig, headLocal)` returns the new pose for a player rig, given the rig's current world pose and the head's pose local to the rig, so the head lands at the origin facing -Z. Both use only position on the floor plane and yaw. Pitch and roll are untouched, and the offset's own `y` is always 0. How each binding applies the result differs, and each page below says how.

| Binding | How `recentre()` moves the viewer | What it needs |
| --- | --- | --- |
| three.js | offsets the renderer's reference space with `recentreOffset` | the optional `getReferenceSpace`, `setReferenceSpace` and `getFrame` members on the manager, and an `XRRigidTransform` constructor or the `rigidTransform` option |
| IWSDK | moves the player rig with `recentreRig` | the optional `player` and `playerSpaceEntities` members on the world |
| Babylon.js | moves the XR camera with `recentreRig` | the optional `camera` member on the XR experience |
| Native | calls `NativeHost.recentre`, and the app offsets its own reference space | an app that provides `recentre` |

Where the prerequisite is missing, `recentre()` does nothing. `MockRuntimeAdapter` takes a `supportedModes` option for what `isSupported` reports, and counts calls to `recentre()` in `recentreCount`, so a test can check that a service asked for it.

### The capability override rule

Every adapter that derives capabilities also exposes `setCapabilities(partial)`, a sticky override layered on top of what it derives. An override wins for as long as it is set: it survives every later derivation, so forcing `passthrough: true` on a device that under-reports its blend mode keeps working when the session changes. `clearCapabilityOverrides()` drops every override and falls back to the derived values, and `dispose()` drops them too. The method stays off the `RuntimeAdapter` interface itself, because a service must only read capabilities, never force them; only the app wiring the adapter calls it. `MockRuntimeAdapter` follows the same rule, so a test that calls `setCapabilities` behaves like a real adapter would.

## Plain TypeScript

The lowest-level pattern and the easiest way to see what the framework does.

```ts
import { createBrowserEnvironment, createServiceProfile, ServiceManager, TimerScheduler } from "@realitycollective/service-framework";

const manager = new ServiceManager({
  scheduler: new TimerScheduler({ requestAnimationFrameFn: requestAnimationFrame, cancelAnimationFrameFn: cancelAnimationFrame }),
  environment: createBrowserEnvironment(),
});

manager.initializeProfile(createServiceProfile("app", [
  { token: LOGGER_TOKEN, config: { level: "info" }, useClass: LoggerService },
]));

manager.start();
manager.resolve(LOGGER_TOKEN).log("Application started");
```

`TimerScheduler` drives `tick` and `lateTick` every 16 ms and `fixedTick` every 50 ms by default; pass `requestAnimationFrameFn` to get `renderTick` as well. `ManualScheduler` drives nothing until you call `emit`, which is what tests and tools want.

`TimerScheduler` counts each channel on its own counter, from 1, and every context it emits names `source: "timer"`, as a binding names itself. A service counting render frames sees 1, 2, 3 whatever the other channels do. Before 1.0.2 all four channels shared one counter, so such a service saw gaps.

The manager needs no global `AbortController`. It uses the global when the host has one and otherwise a small internal controller whose signal carries `aborted`, `reason`, `onabort`, `addEventListener("abort")` and `removeEventListener`. A bare engine such as Hermes can therefore boot a profile.

## React

Wrap the application in `ServiceFrameworkProvider` and call `useService()` inside components. The provider creates or receives a `ServiceManager`, initializes the supplied profile and starts it by default.

```tsx
import { createServiceProfile, TimerScheduler } from "@realitycollective/service-framework";
import { ServiceFrameworkProvider, useService } from "@realitycollective/service-framework-react";

function StatusPanel() {
  const status = useService(STATUS_TOKEN);
  return <p>{status.message}</p>;
}

const profile = createServiceProfile("react-example", [
  { token: STATUS_TOKEN, useClass: StatusService },
]);

export function App() {
  return (
    <ServiceFrameworkProvider profile={profile} scheduler={new TimerScheduler()}>
      <StatusPanel />
    </ServiceFrameworkProvider>
  );
}
```

The provider drives no channels itself. Without the `scheduler` prop the manager uses `ManualScheduler`, so services get `initialize()` and `start()` and nothing per frame. That is fine for services that only respond to calls; pass a `TimerScheduler` when any service needs `update()`. Components that need to re-render when a service changes subscribe to a `SnapshotService` or an event service. See the [React package](../integrations/react.md) page.

## three.js

For `render()` only, bridge the animation loop:

```ts
import { ThreeRenderLoopBridge } from "@realitycollective/service-framework-three";

const bridge = new ThreeRenderLoopBridge({ scheduler: manager.scheduler, host: renderer });
bridge.start();
```

For XR capabilities and sessions, use the adapter and let it own the loop:

```ts
import { WebXRRuntimeAdapter } from "@realitycollective/service-framework-three";

const adapter = new WebXRRuntimeAdapter({ xr: renderer.xr, host: renderer, scheduler: manager.scheduler, manager });
adapter.start();
```

Build the profile after the adapter exists so services can take it through their configuration. With `manager` given, the adapter raises focus and pause from the session's visibility and feeds no frame while a live session is hidden. An app that owns its own loop, such as one built on Google XR Blocks, never calls `start()` and drives the same step by hand with `adapter.tick(timestampMs)`. See the [three.js package](../integrations/three.md) page.

## Babylon.js

Same two options. The bridge hooks `engine.runRenderLoop()`:

```ts
import { BabylonRenderLoopBridge } from "@realitycollective/service-framework-babylon";

const bridge = new BabylonRenderLoopBridge({ scheduler: manager.scheduler, host: engine });
bridge.start();
```

`BabylonRuntimeAdapter` is the adapter over `WebXRDefaultExperience` and can own the loop in the same way, with the same `manager` option and the same visibility gate; `adapter.tick()` is the hand-driven form. The package also ships `BaseBabylonService`, a base class for services that receive an already-built `engine` and `scene` through their configuration. It exposes them as typed getters and declares an `onRenderTick(context)` hook; the service wires that hook itself in `start()` with `this.scheduler.subscribe("renderTick", ...)`. See the [Babylon.js package](../integrations/babylon.md) page.

## Meta IWSDK

IWSDK owns its loop, so this binding relays frames rather than producing them. A system registered with the world calls `adapter.emitFrame()` and emits `renderTick` on every frame the session is visible, and raises `focusChange` and `pauseChange` when visibility changes.

```ts
import { createServiceProfile } from "@realitycollective/service-framework";
import { makeServiceBridgeSystem, startServiceRuntime } from "@realitycollective/service-framework-iwsdk";
import { createSystem, VisibilityState } from "@iwsdk/core";

const { manager, adapter } = startServiceRuntime(world, (adapter) =>
  createServiceProfile("my-app", [
    { token: PASSTHROUGH_TOKEN, config: { adapter }, useClass: PassthroughService },
  ]),
);

world.registerSystem(
  makeServiceBridgeSystem({ adapter, manager, world, createSystem, visibleState: VisibilityState.Visible }),
);
```

Services depend on `RuntimeAdapter`, never on `@iwsdk/core`. See the [Meta IWSDK package](../integrations/iwsdk.md) page.

## Native

A native XR app, such as an OpenXR app on Quest or a CompositorServices app on visionOS, embeds a JavaScript engine such as Hermes. It owns the session, the frame loop, rendering and physics itself. It installs one host object, `globalThis.__rcHost`, before the bundle runs, and `NativeRuntimeAdapter` reads it:

```ts
import { ServiceManager, TimerScheduler } from "@realitycollective/service-framework";
import { NativeRuntimeAdapter, createNativeHostIO } from "@realitycollective/service-framework-native";

const scheduler = new TimerScheduler();
const manager = new ServiceManager({ scheduler });
const adapter = new NativeRuntimeAdapter({ scheduler, manager });   // reads globalThis.__rcHost
```

Services tick only while the session is focused, as they do under the IWSDK bridge: a host frame outside focus reaches no frame listener and no `renderTick`, and does not advance the frame count. Given `manager`, the adapter raises `focusChange` and `pauseChange` on every change of focus. `FrameInfo` and `renderTick` carry the same units as every other binding: `timestamp` in milliseconds, `FrameInfo.delta` in seconds, `LifecycleContext.deltaTime` in milliseconds. Capabilities derive from the OpenXR session state, the enabled extensions and the blend mode, with the same sticky `setCapabilities` override every adapter has. A native host also needs `HostIO`, over `createNativeHostIO()`, because a bare engine like Hermes has no `fetch` or `DecompressionStream`; see [`HostIO`](../features/host_io.md). See the [Native package](../integrations/native.md) page for the full host object contract and the host globals the embedded engine must provide.

## The client package

`@realitycollective/service-framework-client` is React and three.js already wired: it owns the manager and the scheduler, binds the three.js render loop, and ships a starting profile. Use it when that is the shape of your app; use the core plus one binding when you need a different host or want to own the composition. See the [client package](../integrations/client.md) page.

## Runtime operation

Whatever the host, the order is the same:

1. the host creates or receives the manager and gives it a scheduler and an environment
2. `initializeProfile` registers every service the environment allows, constructs them in priority order and then profile order, and calls `initialize()` on each
3. `start` calls `start()` on each service in the same order
4. the host feeds the scheduler; the manager forwards each channel to every service
5. `dispose` calls `destroy()` in reverse order and aborts each service's `abortSignal`

## More information

- [Host integrations](../integrations/core.md): one page per package, including the full API of each adapter
- [Conformance suites](../features/conformance_suites.md): the suites every binding on this page passes
- [Service design](./03_service_design.md): the lifecycle tables
- [Walkthrough: weather client](../walkthrough-weather-client.md): a React app end to end
