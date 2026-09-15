---
sidebar_position: 6
---

# Host runtimes and schedulers

The core package has no loop and no knowledge of the browser, a renderer or a headset. Something has to feed it frames, visibility and, for XR, a session. That something is a host binding. This page explains the two seams a binding plugs into, which binding drives what, and how a service reaches host-specific features without depending on the host.

## Overview

There are two seams, both defined in the core package:

1. **The scheduler.** Named channels (`tick`, `renderTick`, `focusChange` and so on) that the manager forwards to every service as lifecycle calls. A binding emits on these channels from the host's own loop.
2. **`RuntimeAdapter`.** An interface a service can depend on to reach the host directly: per-frame callbacks, XR capability flags, and an optional session facet. Each binding ships an adapter that implements it; the core ships `MockRuntimeAdapter` for tests.

Services never import a host package. They implement lifecycle methods from `BaseService`, and when they need the host, they take a `RuntimeAdapter` through their configuration or a dependency.

## Which host drives which channel

| Host | Package | Emits `renderTick` | Emits `tick` / `lateTick` / `fixedTick` | Emits `focusChange` / `pauseChange` |
| --- | --- | --- | --- | --- |
| Plain browser, `TimerScheduler` | core | only if `requestAnimationFrameFn` is passed | yes, from timers | no |
| Plain browser, `ManualScheduler` | core | no | no | no |
| React | `service-framework-react` | no | no | no |
| three.js | `service-framework-three` | yes, `source: "three"` | no | no |
| Babylon.js | `service-framework-babylon` | yes, `source: "babylon"` | no | no |
| Meta IWSDK | `service-framework-iwsdk` | yes, `source: "iwsdk"`, only while visible | no | yes, from the world's visibility |
| Client (React + three) | `service-framework-client` | yes, through the three.js bridge | no | no |

Three things follow from this table:

- On a renderer host, per-frame work belongs in `render()`. `update()` does not fire unless you also use a `TimerScheduler`.
- The schedulers compose. `TimerScheduler` extends `ManualScheduler`, so one manager can have timers driving `tick` and a bridge driving `renderTick`.
- Outside IWSDK, focus and pause are yours to raise. Wire the browser's visibility to the manager once and every service gets `onFocusChange` and `onPauseChange`:

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
| `onFrame(listener)` | a per-frame callback with `{ timestamp, delta }`; `delta` is in seconds here, unlike the scheduler's millisecond `deltaTime` |
| `getCapabilities()` and `onCapabilitiesChange(listener)` | `{ immersive, handTracking, planeDetection, passthrough, environmentBlendMode }`, which change when a session starts or ends |
| `session` (optional) | `getState()`, `request(mode, options)`, `end()`, `onStateChange`, `onVisibilityChange`; present only on hosts that own an XR session |

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

The same class runs under three.js, Babylon.js or IWSDK, because every adapter implements the same interface and passes the same conformance suite (`runtimeAdapterContractCases()`). In a test, hand it a `MockRuntimeAdapter` and call `setCapabilities({ passthrough: true })`.

Session control goes through the facet when the host has one:

```ts
const result = await adapter.session?.request("immersive-ar", { requiredFeatures: ["hand-tracking"] });
if (result && !result.ok) {
  console.warn(`No session: ${result.reason}`);
}
```

`request` never throws; it resolves `{ ok: false, reason }` with `unsupported`, `denied`, `timeout` or `error`. The default timeout is 10 seconds; pass `timeoutMs` to change it.

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

const adapter = new WebXRRuntimeAdapter({ xr: renderer.xr, host: renderer, scheduler: manager.scheduler });
adapter.start();
```

Build the profile after the adapter exists so services can take it through their configuration. See the [three.js package](../integrations/three.md) page.

## Babylon.js

Same two options. The bridge hooks `engine.runRenderLoop()`:

```ts
import { BabylonRenderLoopBridge } from "@realitycollective/service-framework-babylon";

const bridge = new BabylonRenderLoopBridge({ scheduler: manager.scheduler, host: engine });
bridge.start();
```

`BabylonRuntimeAdapter` is the adapter over `WebXRDefaultExperience` and can own the loop in the same way. The package also ships `BaseBabylonService`, a base class for services that receive an already-built `engine` and `scene` through their configuration. It exposes them as typed getters and declares an `onRenderTick(context)` hook; the service wires that hook itself in `start()` with `this.scheduler.subscribe("renderTick", ...)`. See the [Babylon.js package](../integrations/babylon.md) page.

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
- [Service design](./03_service_design.md): the lifecycle tables
- [Walkthrough: weather client](../walkthrough-weather-client.md): a React app end to end
