---
sidebar_position: 2
---

# Getting Started guide

Everything in the framework is code: no editor, no generator, no assets. This guide takes a plain TypeScript project from an empty file to a running service in six steps.

## Overview

You will:

1. install the core package
2. create a `ServiceManager` with a scheduler and an environment
3. create the root configuration, a profile
4. write a service and its token
5. register the service in the profile
6. resolve the service and check the manager is ready

## Installing the Service Framework

```sh
npm install @realitycollective/service-framework
```

Add the binding for your host when you have one; [host runtimes](./06_host_runtimes.md) explains each. Plain TypeScript needs nothing else.

## Creating the Service Manager

The manager is an object you create. It takes two things. A scheduler is the object the host feeds with frames; the manager turns each frame into `update`, `render` and the other per-frame calls on your services. An environment descriptor is a named set of capability strings that says what the host can do, such as `dom` or `render-loop`; `createBrowserEnvironment()` builds the usual one for a browser page.

```ts
import { createBrowserEnvironment, ManualScheduler, ServiceManager, TimerScheduler } from "@realitycollective/service-framework";

// Tests and tools: ManualScheduler fires nothing until you emit a channel yourself.
const manual = new ServiceManager({ scheduler: new ManualScheduler() });

// A browser app without a render engine: TimerScheduler runs timers that drive update, lateUpdate and fixedUpdate.
const timed = new ServiceManager({
  scheduler: new TimerScheduler(),
  environment: createBrowserEnvironment(),
});
```

Both arguments are optional. The defaults are a `ManualScheduler`, which emits nothing on its own, and an environment with no capabilities. Those defaults suit a test; a real app passes both.

A React app uses the provider from `service-framework-react`, which owns the manager for you. A three.js or Babylon.js app bridges its render loop into the scheduler. Both are covered in [host runtimes](./06_host_runtimes.md).

## Creating the root configuration for the Service Manager

The root configuration is a profile: a named list of registrations.

```ts
import { createServiceProfile } from "@realitycollective/service-framework";

export const profile = createServiceProfile("my-app", [
  // registrations go here
]);
```

The profile is plain data, so it can be built in code, loaded from JSON, or assembled from several smaller lists.

## The environment switcher

The environment descriptor is how a profile behaves differently on different hosts. Supply your own to test how a profile behaves with a given set of capabilities:

```ts
import { createEnvironmentDescriptor, ManualScheduler, ServiceManager } from "@realitycollective/service-framework";

const environment = createEnvironmentDescriptor("test", ["dom", "render-loop"]);
const manager = new ServiceManager({ scheduler: new ManualScheduler(), environment });
```

Registrations that require a capability the environment lacks are left out. [Service design](./03_service_design.md) covers the gating rules.

## Writing a service

A service is a class, plus a token that identifies it at runtime.

```ts
import { BaseService, createServiceToken } from "@realitycollective/service-framework";

export interface LoggerConfig {
  readonly level: "info" | "debug";
}

export class LoggerService extends BaseService<LoggerConfig> {
  public override initialize(): void {
    console.log(`Logger ready at ${this.serviceConfig.level}`);
  }

  public log(message: string): void {
    console.log(`[${this.serviceConfig.level}] ${message}`);
  }
}

export const LOGGER_TOKEN = createServiceToken<LoggerService>("LoggerService");
```

The token exists because TypeScript interfaces are erased when the code is compiled, so the framework needs a runtime identity to look a service up by. The type parameter keeps that lookup strongly typed in your editor.

Things to notice inside the class:

- `serviceName` and `servicePriority` come from the registration
- `serviceConfig` is the typed configuration object supplied in the profile
- `manager`, `scheduler`, `environment` and `abortSignal` are available on the base class

## Configuring your service

A registration says which class, what name, what priority, what configuration. Add one to the profile's list:

```ts
{
  token: LOGGER_TOKEN,
  name: "Logger",            // optional; defaults to the token description
  priority: 5,               // optional; defaults to 10, lower starts first
  config: { level: "debug" },
  useClass: LoggerService,
},
```

`useFactory` is the alternative to `useClass` when construction needs more than `new`:

```ts
{
  token: LOGGER_TOKEN,
  useFactory: (context) => new LoggerService(context),
}
```

## Accessing your service

### Check your Service is registered

```ts
manager.initializeProfile(profile);
manager.start();

const maybeLogger = manager.tryResolve(LOGGER_TOKEN); // undefined if not registered
```

### Get a reference to your service using resolve

```ts
const logger = manager.resolve(LOGGER_TOKEN);
logger.log("Application started");
```

`resolve` throws `Unable to resolve service "..."` when nothing is registered for the token. Loud, and early.

### Safer access to getting a service

`tryResolve` returns `undefined` instead of throwing:

```ts
const logger = manager.tryResolve(LOGGER_TOKEN);
if (logger) {
  logger.log("Optional logging enabled");
}
```

When several services share a token, `resolveAll` returns every one and `resolve(token, name)` picks one by registration name. [Service patterns](./05_service_patterns.md) covers that model.

## Checking the Service Manager is ready

Code that runs before the profile is initialized can wait for it, and a resolve can wait for a service to appear:

```ts
await manager.waitUntilInitialized();

// Waits up to two seconds for a service registered later, for example after an async host setup.
const logger = await manager.resolveAsync(LOGGER_TOKEN, 2000);
```

This matters when composition happens in stages: the React provider mounting, an XR session starting, a profile loaded from the network. Both default to a one second timeout.

## See the running state of your service

The manager reports its state as data:

```ts
const diagnostics = manager.getDiagnostics();   // initialized, started, and every service with its priority and modules
const graph = manager.getDependencyGraph();     // who depends on whom, in start order
```

`getDiagnostics()` answers "what is the state right now". For "what happened, and in what order", give the manager a log function; [logging and telemetry](../features/logging_and_telemetry.md) explains what it reports.

## Check the API docs for more calls

The [TypeScript API reference](pathname:///api/typescript/) is generated from the source and lists every method on `ServiceManager`, `BaseService` and the rest.

## Onward

[Service design](./03_service_design.md) goes deeper into what a service should own, its lifecycle and how it reacts to the environment.

## More information

- [Introduction](./01_introduction.md)
- [Service design](./03_service_design.md)
- [Host runtimes](./06_host_runtimes.md)
- [Walkthrough: weather client](../walkthrough-weather-client.md)
- Coming from Unity? [Migrating from Unity](../features/migrating_from_unity.md) maps each concept
