---
sidebar_position: 7
---

# Dependency Injection

A service declares what it depends on in its registration, and the manager constructs those dependencies first and passes them into the constructor. This page covers the rules, the errors you can hit, and a three-service tutorial.

## Overview

A service that needs another service says so in its registration. The manager constructs the dependency first and passes the instance into the constructor. Nothing reaches for a global; the relationship is data in the profile.

## What is Dependency Injection?

Instead of a service finding what it needs (`manager.resolve(...)` inside a method), the thing that creates the service hands the dependencies in. Here, the thing that creates services is the manager, and "hands in" means constructor arguments after the activation context.

## Why Use Dependency Injection?

### Explicit Dependencies

The profile shows who needs whom. `getDependencyGraph()` returns the same information at runtime.

### Compile-Time Safety

The constructor parameter is typed, so a registration that lists the wrong token does not compile against the class. Two failure modes remain, and they are different. A token that is listed but not registered fails at construction with an error naming it. A parameter the constructor declares but the `dependencies` array omits receives `undefined` at runtime, which is why the array and the constructor should live in the same file.

### Improved Testability

A test constructs the service directly with a hand-built context and a fake for each dependency. No manager, no profile.

### Better Performance

Dependencies are resolved once, at construction. A service holds a direct reference for its lifetime rather than looking the dependency up on every call.

### Clearer Service Relationships

The graph is data: `getDependencyGraph()` returns it, and a cycle is rejected before anything is constructed.

## Declaring Service Dependencies

### Basic Constructor Pattern

```ts
import { BaseService, type ServiceActivationContext } from "@realitycollective/service-framework";

export class DashboardService extends BaseService {
  public constructor(
    context: ServiceActivationContext,
    private readonly logger: LoggerService,
  ) {
    super(context);
  }

  public override start(): void {
    this.logger.log("Dashboard service started");
  }
}
```

```ts
{
  token: DASHBOARD_TOKEN,
  dependencies: [LOGGER_TOKEN],
  useClass: DashboardService,
}
```

### Key Requirements

- the first constructor parameter is always the activation context, passed to `super`
- the remaining parameters receive the dependencies in the order of the `dependencies` array
- the same order applies to `useFactory`: `(context, ...dependencies) => new Service(context, ...dependencies)`
- a dependency must be registered (and enabled by the environment) or construction fails

Use dependencies when one service truly depends on another service. Do not turn every helper function into a service.

## Registration Order Requirements

### Configuration Order

A dependency must already be constructed when the service that needs it is constructed. The manager walks the profile in priority order, and within equal priority in the order listed, constructing each service and resolving its dependencies as it goes. So list a dependency before its dependants, or give it a lower priority number. If a dependency comes later, construction fails with `Unable to resolve service "<name>"`.

The manager does check the graph before it starts: a cycle in the `dependencies` arrays throws before anything is constructed. It does not reorder the profile for you.

### Using Priority Values

Priority is the primary ordering. Lower starts first; the default is `10`. A dependency with a higher priority number than its dependant is constructed after it, and the dependant fails to resolve it, so keep dependencies at equal or lower numbers than the services that need them.

## Multiple Dependencies

```ts
export class ReportService extends BaseService {
  public constructor(
    context: ServiceActivationContext,
    private readonly logger: LoggerService,
    private readonly settings: SettingsService,
    private readonly weather: WeatherService,
  ) {
    super(context);
  }
}

{
  token: REPORT_TOKEN,
  dependencies: [LOGGER_TOKEN, SETTINGS_TOKEN, WEATHER_TOKEN],
  useClass: ReportService,
}
```

### Transitive Dependencies

If `WeatherService` depends on `LoggerService`, the manager constructs the logger first, then weather, then the report. Each service declares only its direct dependencies.

## Error Handling

### Missing Dependency

A dependency that is not registered, that the environment filtered out, or that is listed after the service needing it, fails at construction with `Unable to resolve service "<name>"`. The application does not start with a hole in it; the error names the missing service.

### Wrong Constructor Signature

The constructor receives whatever the `dependencies` array lists, in order. A mismatch between the array and the parameters is a type error in strict TypeScript where the class is registered, and a runtime `undefined` otherwise. Keep the array and the constructor together in the same file so they cannot drift.

### Circular Dependencies

Two services that depend on each other cannot both be constructed first. The manager checks for this before constructing anything and throws `Circular dependency detected while ordering "<name>"` during `initializeProfile`. Break the cycle by moving the shared behaviour into a third service, or by switching one side to runtime retrieval through the manager.

## Tutorial: Building Services with Dependencies

Three services in a chain: logging needs the current user, and the user service needs authentication.

### Step 1: Create the Authentication Service

```ts
export class AuthenticationService extends BaseService {
  private token: string | undefined;

  public async signIn(user: string): Promise<void> {
    this.token = `token-for-${user}`;
  }

  public get isSignedIn(): boolean {
    return this.token !== undefined;
  }
}

export const AUTH_TOKEN = createServiceToken<AuthenticationService>("Authentication");
```

### Step 2: Create the User Service

```ts
export class UserService extends BaseService {
  public constructor(context: ServiceActivationContext, private readonly auth: AuthenticationService) {
    super(context);
  }

  public currentUser(): string | undefined {
    return this.auth.isSignedIn ? "current-user" : undefined;
  }
}

export const USER_TOKEN = createServiceToken<UserService>("User");
```

### Step 3: Create the Logging Service

```ts
export class LoggingService extends BaseService {
  public constructor(context: ServiceActivationContext, private readonly users: UserService) {
    super(context);
  }

  public log(message: string): void {
    console.log(`[${this.users.currentUser() ?? "anonymous"}] ${message}`);
  }
}

export const LOGGING_TOKEN = createServiceToken<LoggingService>("Logging");
```

### Step 4: Configure the Services

Dependencies first, so each one exists when the next is constructed.

```ts
export const profile = createServiceProfile("tutorial", [
  { token: AUTH_TOKEN, useClass: AuthenticationService },
  { token: USER_TOKEN, dependencies: [AUTH_TOKEN], useClass: UserService },
  { token: LOGGING_TOKEN, dependencies: [USER_TOKEN], useClass: LoggingService },
]);
```

### Step 5: Use the Services

```ts
manager.initializeProfile(profile);
manager.start();

await manager.resolve(AUTH_TOKEN).signIn("simon");
manager.resolve(LOGGING_TOKEN).log("signed in");
```

## Comparison: Constructor Injection vs Runtime Retrieval

### When to Use Constructor Injection

- the dependency is required for the service to function
- the relationship is stable for the service's lifetime
- you want the graph visible in the profile and enforced at startup

### When to Use Runtime Retrieval

- the dependency is optional (`manager.tryResolve`)
- the dependency may be registered later (`manager.resolveAsync`)
- injection would create a cycle

## Tips and tricks

- export a service's token from the same file as its class, and register with `useClass` in the profile so the constructor and the `dependencies` array are reviewed together
- `getDependencyGraph()` is the quickest way to see who depends on whom when a resolve fails at startup
- a module can declare dependencies on top-level services and on sibling modules listed before it; the parent is always reachable through `parentService`
- services registered later with `manager.register()` can depend on anything already running

## More information

- [Service patterns](./05_service_patterns.md)
- [Advanced services](./04_advanced_services.md)
- Coming from Unity? [Migrating from Unity](../features/migrating_from_unity.md) maps each concept
