---
sidebar_position: 3
---

# Service Design

A service is a plain TypeScript class. The manager creates it from a registration, hands it a typed configuration, drives its lifecycle, and hands it out by token to whatever needs it. This page covers what a service owns, which lifecycle calls it receives and where those calls come from, and how it reacts to the environment it runs in.

## Overview

Every service extends `BaseService<TConfig>`. The base class gives it a name, a priority, its configuration, a handle on the manager and the scheduler, the environment descriptor, and an abort signal that fires when the service is disposed. It also declares the lifecycle methods, all of them empty, so a service overrides only the ones it needs.

## What is a Service?

A service owns one responsibility for the whole application: settings, a data feed, a session, a leaderboard. It is not a React component and not a module-level singleton. The framework hands it everything it needs to do its job:

- `serviceName` and `servicePriority` from the registration
- `serviceConfig`, the typed configuration object from the profile
- `manager`, to resolve other services at runtime when a constructor dependency is not the right fit
- `scheduler`, to subscribe to a channel directly when the base class method is not enough
- `environment`, to ask which capabilities the host has
- `abortSignal`, an `AbortSignal` that aborts when the service is disposed, for cancelling fetches, timers and listeners
- `logEvent`, the telemetry emitter ([logging and telemetry](../features/logging_and_telemetry.md))

### Performance

Services are ordinary objects; there is no reflection or proxying at runtime. Resolution is a map lookup by token. Lifecycle delivery is one scheduler subscription per channel, held by the manager, which then loops over the services. A service that does not override `update()` still receives the call, but an empty method costs almost nothing.

### Accessing your code

Anything that holds the manager resolves a service with `manager.resolve(TOKEN)`. In React, `useService(TOKEN)` does the same from a component. Prefer passing services into other services through constructor dependencies over reaching for the manager inside methods; [dependency injection](./07_dependency-injection.md) explains why.

### Testing

Construct the service yourself with a hand-built activation context and fake dependencies, then call its methods. To test lifecycle behaviour, give the manager a `ManualScheduler`. It emits nothing on its own, so the test emits a channel (a named lifecycle signal such as `tick`) when it wants the matching method to run:

```ts
const scheduler = new ManualScheduler();
const manager = new ServiceManager({ scheduler });
manager.initializeProfile(profile);
manager.start();

scheduler.emit("tick", { timestamp: 16, deltaTime: 16, frame: 1, source: "test" });
```

No browser, no DOM, no host. Services that talk to an XR host are tested the same way against `MockRuntimeAdapter`; [host runtimes](./06_host_runtimes.md) covers that seam.

### Summary

Keep logic in services, keep UI thin, keep each service to one job.

## Using a Service Profile

The profile is the registration manifest. Each entry names the token, the class or factory, and optionally a name, priority, configuration, dependencies, modules and activation rules.

```ts
import { createServiceProfile } from "@realitycollective/service-framework";

export const profile = createServiceProfile("app", [
  {
    token: LOGGER_TOKEN,
    config: { level: "debug" },
    useClass: LoggerService,
  },
]);
```

This says: register a service identified by `LOGGER_TOKEN`, give it the configuration `{ level: "debug" }`, create it using the `LoggerService` class. The manager activates the profile with `initializeProfile(profile)`. Profiles are plain data, so they can be composed from smaller lists or loaded from JSON.

## The lifecycle

The framework has no engine loop of its own. Instead it defines a small set of lifecycle calls on every service, and a scheduler with named channels that the host feeds. Two groups of calls exist, and it matters which group a method is in.

### Calls the manager makes

These happen because you called something on the manager. They do not depend on any host.

| Method | When |
| --- | --- |
| `initialize()` | during `initializeProfile()` (or `register()`), once the service and its modules are constructed |
| `start()` | during `manager.start()`, in registration order (priority, then profile order) |
| `reset()` | during `manager.reset()` |
| `destroy()` | during `manager.dispose()`, in reverse order; the service's `abortSignal` aborts at the same time |

### Calls the scheduler delivers

These happen only when something emits the matching channel on the manager's scheduler. The manager subscribes to every channel once and forwards each to every service.

| Scheduler channel | Service method | Payload |
| --- | --- | --- |
| `tick` | `update(context)` | `LifecycleContext` |
| `lateTick` | `lateUpdate(context)` | `LifecycleContext` |
| `fixedTick` | `fixedUpdate(context)` | `LifecycleContext` |
| `renderTick` | `render(context)` | `LifecycleContext` |
| `focusChange` | `onFocusChange({ focused })` | from `manager.emitFocusChange(focused)` |
| `pauseChange` | `onPauseChange({ paused })` | from `manager.emitPauseChange({ paused })` |
| `startup` | none; the manager calls its own `start()` | |
| `dispose` | none; the manager calls its own `dispose()` | |

`LifecycleContext` carries `timestamp` and `deltaTime` in milliseconds, a running `frame` counter and a `source` string naming whoever emitted it.

### Who emits the channels

This is the part to get right. Nothing emits a channel unless you arrange it:

- the default scheduler is `ManualScheduler`, which emits nothing until code calls `emit`
- `TimerScheduler` emits `tick`, `lateTick` and `fixedTick` from timers, so `update()`, `lateUpdate()` and `fixedUpdate()` run
- the three.js, Babylon.js and Meta IWSDK bindings emit `renderTick` once per host frame, so `render()` runs; they never emit `tick`
- only the IWSDK binding emits `focusChange` and `pauseChange` for you; elsewhere the app calls `manager.emitFocusChange()` itself

So a service that overrides `update()` does nothing on a three.js host with the default scheduler. Either do per-frame work in `render()`, or give the manager a `TimerScheduler` alongside the render-loop bridge. [Host runtimes](./06_host_runtimes.md) has the full matrix of hosts and channels.

Override only what you need; the rest are no-ops. A service can also subscribe to a channel directly with `this.scheduler.subscribe("renderTick", handler)`, which returns an unsubscribe function.

## Platform support: environment capabilities

Services are gated by capability. The environment descriptor names the host and carries a set of capability strings. A registration can require capabilities, or supply a rule, and the manager leaves the service out when the environment does not qualify.

The strings are free-form. `createBrowserEnvironment()` gives `dom`, `focus`, `visibility`, `timers` and `render-loop`; your app adds whatever it can detect, such as `webgl` or `network`. Note that the manager's default environment has no capabilities at all, so pass one in when you gate anything:

```ts
import { createBrowserEnvironment, ServiceManager } from "@realitycollective/service-framework";

const manager = new ServiceManager({ environment: createBrowserEnvironment() });
```

Require capabilities on the registration, and the manager skips the service when they are missing:

```ts
{
  token: STORAGE_TOKEN,
  requiredCapabilities: ["dom"],
  useClass: LocalStorageService,
}
```

For anything more involved, supply a rule:

```ts
{
  token: SHARE_TOKEN,
  enabledWhen: (environment) => environment.hasCapability("network") && typeof navigator.share === "function",
  useClass: ShareService,
}
```

A service left out this way is not registered at all: `resolve` throws, `tryResolve` returns `undefined`, and a service that depended on it fails to construct.

XR capabilities such as hand tracking or passthrough are a separate, runtime-changing set. They come from the host through `RuntimeAdapter`, not the environment descriptor; see [host runtimes](./06_host_runtimes.md).

## Async work

There are no coroutines; there is `async`. A service may start asynchronous work in `start()` and should tie it to the abort signal so disposal cancels it:

```ts
public override start(): void {
  fetch("/api/weather", { signal: this.abortSignal })
    .then((response) => response.json())
    .then((data) => this.apply(data))
    .catch((error: unknown) => {
      if (!this.abortSignal.aborted) {
        this.logEvent("weather_fetch_failed", { error }, "error");
      }
    });
}
```

An abort shows up as a rejected promise, so the `catch` checks `abortSignal.aborted` and stays quiet for that case. Anything else is reported through `logEvent` rather than thrown, because a throw inside `catch` would only become an unhandled rejection. Callers that need to wait for the framework use `await manager.waitUntilInitialized()` or `await manager.resolveAsync(TOKEN, timeoutMs)`.

## Service hooks and events

A service that needs to notify many listeners extends `BaseEventService<TEvents>` with a typed event map:

```ts
import { BaseEventService } from "@realitycollective/service-framework";

interface WeatherEvents {
  readonly changed: { readonly temperature: number };
}

export class WeatherFeedService extends BaseEventService<WeatherEvents> {
  public publishTemperature(temperature: number): void {
    this.emit("changed", { temperature });
  }
}
```

Listeners subscribe with `on("changed", handler)` and receive an unsubscribe function; `once` and `off` are there too. Reach for this when several components or modules must react to the same change.

When the thing being shared is a piece of state rather than a stream of events, extend `SnapshotService<TConfig, TSnapshot>` instead. It holds one immutable snapshot; `subscribe(listener)` delivers the current value immediately and every later `publishSnapshot` or `updateSnapshot`. React components and other services can read it without polling.

## Auto start behaviour

A registered service is always started with the manager. The levers are elsewhere:

- leave a service out of the profile until it is needed, and register it later with `manager.register(registration)`
- gate it with `requiredCapabilities` or `enabledWhen` so it only exists where it can run
- give a service that must wait a `start()` that does nothing until a dependency signals readiness

## Accessor pattern

TypeScript interfaces are erased at compile time, so a service's identity lives in a token created next to the class:

```ts
export const SETTINGS_TOKEN = createServiceToken<SettingsService>("SettingsService");
```

Export the token from the same module as the class and import both wherever the service is used. Anything else that resolves the service does so through the token, never through the class name, so the implementation can change without touching callers.

## Building a Settings Service

A service that owns persisted preferences, with the storage behind it swappable.

```ts
import { BaseService, createServiceToken } from "@realitycollective/service-framework";

export interface SettingsConfig {
  readonly storageKey: string;
  readonly defaults: Record<string, string>;
}

export class SettingsService extends BaseService<SettingsConfig> {
  private values: Record<string, string> = {};

  public override initialize(): void {
    const stored = globalThis.localStorage?.getItem(this.serviceConfig.storageKey);
    this.values = { ...this.serviceConfig.defaults, ...(stored ? JSON.parse(stored) : {}) };
  }

  public get(key: string): string | undefined {
    return this.values[key];
  }

  public set(key: string, value: string): void {
    this.values[key] = value;
    globalThis.localStorage?.setItem(this.serviceConfig.storageKey, JSON.stringify(this.values));
  }

  public override reset(): void {
    this.values = { ...this.serviceConfig.defaults };
  }
}

export const SETTINGS_TOKEN = createServiceToken<SettingsService>("SettingsService");
```

Registered with its configuration:

```ts
{
  token: SETTINGS_TOKEN,
  config: { storageKey: "my-app.settings", defaults: { theme: "dark" } },
  useClass: SettingsService,
}
```

A component reads `useService(SETTINGS_TOKEN).get("theme")`. Swapping `localStorage` for an account backend is a second class registered under the same token, gated by capability or chosen by name; the component does not change.

## Tips and tricks

- keep UI components thin by putting non-visual logic in services
- use an event service for streams of events and a snapshot service for shared state
- tie every fetch, timer and listener to `this.abortSignal` so disposal is clean
- put per-frame work in `render()` unless a `TimerScheduler` is driving the ticks

## More information

- [Advanced services](./04_advanced_services.md)
- [Service patterns](./05_service_patterns.md)
- [Host runtimes](./06_host_runtimes.md)
- [Dependency injection](./07_dependency-injection.md)
- [Logging and telemetry](../features/logging_and_telemetry.md)
