---
sidebar_position: 4
---

# Advanced Service design and sub services

A service module is a sub-service owned by a parent service, with its own configuration and lifecycle. This page explains when to use one, how to register it, and walks through a leaderboard service built from modules.

## Overview

Most features are a single service. Some features are one service with several interchangeable parts: a leaderboard with one backend per store, an asset loader with one handler per asset type, an interaction service with one module per input device. Modules are how the framework models that.

## What is a Module?

A module is a service that belongs to a parent service. It extends `BaseServiceModule<TParent, TConfig>` instead of `BaseService`, is registered inside the parent's registration, and:

- is created when the parent is created, with the parent already constructed
- follows the parent's lifecycle: initialized, started, reset and disposed with it, and receives the same tick, render, focus and pause calls
- can reach the parent through `parentService`
- has its own token, name, priority and configuration, so it can be resolved directly

```ts
import { BaseServiceModule } from "@realitycollective/service-framework";

export interface AnalyticsConfig {
  readonly sampleRate: number;
}

export class AnalyticsModule extends BaseServiceModule<AppService, AnalyticsConfig> {
  public override start(): void {
    this.parentService.onSessionStarted(() => this.record("session"));
  }

  public record(event: string): void {
    if (Math.random() < this.serviceConfig.sampleRate) {
      // send it
    }
  }
}
```

Use a module when the child logic should automatically follow the parent service lifecycle and needs access to `parentService`. Use a plain service with a dependency when the relationship is looser.

## Profiles for Modules

A module is registered inside the parent's entry, under `modules`. Each module registration has the same shape as a service registration (token, class or factory, name, priority, configuration, dependencies, capability rules), except that a module cannot itself carry `modules`.

```ts
export const profile = createServiceProfile("app", [
  {
    token: APP_TOKEN,
    useClass: AppService,
    modules: [
      {
        token: ANALYTICS_TOKEN,
        config: { sampleRate: 0.1 },
        useClass: AnalyticsModule,
      },
    ],
  },
]);
```

Modules are created after the parent, in priority order and then the order they are listed. A module that depends on a sibling must be listed after it, or given a higher priority number.

## Platform support for Modules

A module registration takes `requiredCapabilities` and `enabledWhen` exactly as a service does. That is how one parent can carry several backends and only construct the one the environment supports:

```ts
modules: [
  { token: STORAGE_MODULE_TOKEN, name: "local", useClass: LocalStorageModule, requiredCapabilities: ["dom"] },
  { token: STORAGE_MODULE_TOKEN, name: "cloud", useClass: CloudStorageModule, enabledWhen: (env) => env.hasCapability("network") },
],
```

## Use cases for Modules

### An Interaction Service

One service that receives commands for operations to be performed in the scene, and a module per input source (hands, controllers, gaze) that translates raw input into those commands. The set of modules can change at runtime as devices connect.

### A Leaderboard Service

One service that handles authentication and caching, and a module per provider: a web backend, a platform store, a local file for development. The app resolves the module it needs, or lets the service pick.

### A Storage Service

One service with the public API, and a module per medium: `localStorage`, IndexedDB, an account backend. Capability rules choose which is constructed.

## Building a Leaderboard Service with modules

The parent owns the shared behaviour. Each module knows one backend.

```ts
import { BaseService, BaseServiceModule, createServiceToken } from "@realitycollective/service-framework";

export interface Score {
  readonly player: string;
  readonly points: number;
}

export interface LeaderboardProvider {
  fetchTop(count: number): Promise<Score[]>;
}

export class LeaderboardService extends BaseService {
  public providers(): readonly LeaderboardProvider[] {
    return this.serviceModules as readonly LeaderboardProvider[];
  }

  public async top(count: number): Promise<Score[]> {
    const [first] = this.providers();
    return first ? first.fetchTop(count) : [];
  }
}

export class WebLeaderboardModule extends BaseServiceModule<LeaderboardService, { readonly endpoint: string }> implements LeaderboardProvider {
  public async fetchTop(count: number): Promise<Score[]> {
    const response = await fetch(`${this.serviceConfig.endpoint}?count=${count}`, { signal: this.abortSignal });
    return (await response.json()) as Score[];
  }
}

export const LEADERBOARD_TOKEN = createServiceToken<LeaderboardService>("Leaderboard");
export const LEADERBOARD_PROVIDER_TOKEN = createServiceToken<WebLeaderboardModule>("LeaderboardProvider");
```

Registered with one provider today and room for more:

```ts
{
  token: LEADERBOARD_TOKEN,
  useClass: LeaderboardService,
  modules: [
    {
      token: LEADERBOARD_PROVIDER_TOKEN,
      name: "web",
      config: { endpoint: "https://example.invalid/leaderboard" },
      useClass: WebLeaderboardModule,
    },
  ],
}
```

`manager.resolve(LEADERBOARD_TOKEN).top(10)` goes through the service. `manager.resolve(LEADERBOARD_PROVIDER_TOKEN, "web")` reaches the module directly when a caller needs a specific backend.

## Tips and tricks

- a module's `serviceConfig` is its own; the parent's configuration is reachable through `parentService.serviceConfig`
- modules are listed in the parent's diagnostics entry, so `getDiagnostics()` shows the whole tree
- keep the parent's public API stable and let modules vary; callers should not need to know which module answered
- a module that needs another top-level service declares it in `dependencies` like any registration

## More information

- [Service patterns](./05_service_patterns.md) for the module-driven and managed service designs
- [Dependency injection](./07_dependency-injection.md)
