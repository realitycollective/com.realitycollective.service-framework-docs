---
sidebar_position: 5
---

# Service Implementation patterns

Services can be combined in a handful of recurring shapes. This page names five of them, from a single standalone service to a service that hides its modules behind one API, and says when each fits.

## Overview

A service framework gives you the pieces. These are the shapes they are usually put together in, from the simplest to the most controlled. Most applications use two or three of them.

## Single Service

One service, one job, no dependencies. Registered, started, resolved.

```ts
export class ClockService extends BaseService {
  public now(): number {
    return performance.now();
  }
}

export const CLOCK_TOKEN = createServiceToken<ClockService>("Clock");

// in the profile
{ token: CLOCK_TOKEN, useClass: ClockService }
```

This is where every service starts. Reach for the other patterns only when a real relationship appears.

## Cooperative Services

Two services where one uses the other. There are two ways to express it.

### Constructor Injection (Recommended)

Declare the dependency in the registration; the manager constructs the dependency first and passes it into the constructor after the activation context.

```ts
export class DashboardService extends BaseService {
  public constructor(context: ServiceActivationContext, private readonly logger: LoggerService) {
    super(context);
  }

  public override start(): void {
    this.logger.log("Dashboard service started");
  }
}

// in the profile
{ token: DASHBOARD_TOKEN, dependencies: [LOGGER_TOKEN], useClass: DashboardService }
```

The relationship is visible in the profile, and a missing dependency fails at startup with the name of what is missing. [Dependency injection](./07_dependency-injection.md) covers the rules.

### Runtime Service Retrieval

Resolve the other service from the manager when it is needed.

```ts
export class DashboardService extends BaseService {
  public override start(): void {
    const logger = this.manager.tryResolve(LOGGER_TOKEN);
    logger?.log("Dashboard service started");
  }
}
```

Use this when the dependency is optional, when it may be registered later, or when it would create a cycle. Otherwise prefer injection.

## Service Providers Model

By default a service and its modules are all registered with the manager and each can be resolved directly. The registration flow is:

1. the profile is read and each service is registered with the manager
2. modules listed in a service's registration are created after their parent
3. the modules are registered too, so the manager manages every entity
4. callers reach the service with `resolve(SERVICE_TOKEN)`, and a specific module with `resolve(MODULE_TOKEN, name)`

A second form of the same idea is several registrations under one token, told apart by name.

```ts
{ token: STORAGE_TOKEN, name: "local", useClass: LocalStorageService },
{ token: STORAGE_TOKEN, name: "cloud", useClass: CloudStorageService },
```

```ts
const all = manager.resolveAll(STORAGE_TOKEN);           // every provider
const cloud = manager.resolve(STORAGE_TOKEN, "cloud");    // one by name
```

Use this when the application needs several implementations of the same contract at once.

## Module Driven Design

The modules are the primary way in, and the service mainly provides what they share (authentication, caching, configuration). This is the shape of the leaderboard example in [advanced services](./04_advanced_services.md): callers resolve the module for the backend they want, and the service stays small.

```ts
const web = manager.resolve(LEADERBOARD_PROVIDER_TOKEN, "web");
await web.fetchTop(10);
```

## Managed Service

With the providers model, both service and modules are always reachable through the manager. Sometimes the service should be the only door: it decides which module answers, and callers never see the modules.

There is no registration flag for this; the pattern is to keep the module classes and their tokens private to the service's own file and expose only the service's API. Modules are still constructed and lifecycle-managed by the manager, but nothing outside the file imports their tokens.

```ts
// leaderboard.ts
const PROVIDER_TOKEN = createServiceToken<WebLeaderboardModule>("LeaderboardProvider"); // not exported

export class LeaderboardService extends BaseService {
  public async top(count: number): Promise<Score[]> {
    const provider = this.serviceModules.find((m) => (m as LeaderboardProvider).fetchTop) as LeaderboardProvider | undefined;
    return provider ? provider.fetchTop(count) : [];
  }
}

export function leaderboardRegistration(endpoint: string): ServiceRegistration<LeaderboardService> {
  return {
    token: LEADERBOARD_TOKEN,
    useClass: LeaderboardService,
    modules: [{ token: PROVIDER_TOKEN, name: "web", config: { endpoint }, useClass: WebLeaderboardModule }],
  };
}
```

Typical uses are asset loading services that pick a handler per asset type, and interaction managers that delegate commands to whichever modules are currently attached.

## Tips and tricks

- keep framework behaviour in the core package and move only host-specific bindings into integration packages
- keep UI components thin by putting non-visual logic in services
- use event services or snapshot wrappers when the UI needs reactive updates from shared runtime state
- keep examples in the package they demonstrate to reduce onboarding friction
- do not turn every helper function into a service; keep simple utility code simple

## More information

- [Advanced services](./04_advanced_services.md)
- [Dependency injection](./07_dependency-injection.md)
