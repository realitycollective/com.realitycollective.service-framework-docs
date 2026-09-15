---
sidebar_position: 1
---

# Introduction

The Service Framework for the web is a small runtime for organising an application as services: classes with a lifecycle, explicit dependencies and one place to be registered. This page explains why that is worth doing, what the pieces are, and how they fit together in a running app.

## Why use a Service Framework?

A web application accumulates the same problems as any long-lived codebase. A module-level singleton here, a React context that reaches into another there. A fetch started from a component that nobody cancels. An initialisation order that only works because of the order the files happen to import. Six months in, nothing can be tested without mounting the whole app, and swapping one backend for another means touching every caller.

A service framework puts each piece of logic in a service. The manager creates services in the right order, drives their lifecycle, and hands them to whatever asks. UI stays thin, and each service can be constructed on its own in a test.

## Enter the Service Framework

The pieces, with the names you will see in code:

- `ServiceManager` creates, initializes, starts, resolves and disposes services
- `BaseService` is the base class for most services
- `BaseServiceModule` is the child-service pattern for features that belong to a parent service
- `BaseEventService` is the base class for services that publish typed events
- `SnapshotService` is the base class for services that own a piece of shared state
- service tokens are the runtime identifiers for services
- service profiles are the registration manifests for your application
- schedulers carry the lifecycle channels: named signals such as `tick` or `renderTick` that the host emits and the manager turns into method calls on every service
- environment descriptors carry capability strings such as `dom` or `render-loop`
- `RuntimeAdapter` is the interface a service uses to reach the host: frames, XR capabilities and sessions

The framework is built around one idea: keep application behaviour in services, and keep host-specific code thin.

### Why a core and bindings?

A web app has no single engine loop. Depending on the project, frames come from a three.js animation loop, a Babylon.js engine, the Meta IWSDK system scheduler, a `setInterval`, or nothing at all in a React form. XR sessions, capability flags and visibility come from whichever of those hosts owns the headset. If the framework depended on any one of them, every service written against it would be tied to that host and would break when the app moved to another.

So the framework is split in two:

- **The core** owns everything that does not care about the host: the manager, dependency injection, profiles, tokens, the lifecycle methods on `BaseService`, events, and the scheduler with its named channels. It also defines the `RuntimeAdapter` interface, which is the only way a service is allowed to see the host. The core has no loop of its own, imports no renderer, and runs under Node in a unit test.
- **A binding** is the small package that knows one host. It does two jobs. It emits scheduler channels from the host's loop, so `render()` runs once per frame. And it implements `RuntimeAdapter` over the host's XR session, so a service can ask about capabilities or request a session through the core interface rather than through three.js, Babylon or IWSDK directly.

What this means in practice:

- a service imports only the core; it can be moved between hosts, or tested with `MockRuntimeAdapter` and a `ManualScheduler`, without change
- which lifecycle calls a service receives depends on the binding you chose, not on the core; a renderer binding delivers `render()`, and `update()` needs a `TimerScheduler`
- the host-specific hooks a binding adds (a session facet, a Babylon scene getter, IWSDK frame relay) are reached through the core's interfaces, so they show up as members of `RuntimeAdapter` or as a base class in the binding, never as a new lifecycle
- adding a host means writing one binding, not touching any service

[Host runtimes](./06_host_runtimes.md) lists which binding drives which channel and what each adapter exposes.

### Core plus host bindings

`@realitycollective/service-framework` is the runtime core. A host binding connects it to one particular host: it feeds the scheduler from the host's loop and implements `RuntimeAdapter` over the host's XR session.

| Package | Responsibility | Use it when |
| --- | --- | --- |
| `@realitycollective/service-framework-react` | React provider and hooks | your UI is built with React |
| `@realitycollective/service-framework-three` | three.js render-loop bridge and WebXR runtime adapter | your renderer is three.js |
| `@realitycollective/service-framework-babylon` | Babylon.js render-loop bridge and runtime adapter | your renderer is Babylon.js |
| `@realitycollective/service-framework-iwsdk` | Meta IWSDK frame bridge and runtime adapter | your app runs inside the IWSDK engine loop |
| `@realitycollective/service-framework-client` | a pre-wired client runtime for React and three.js | you want a higher-level runtime instead of composing everything yourself |

### How a running application fits together

1. you define one or more service tokens
2. you create classes that extend `BaseService`, `BaseEventService` or `SnapshotService`
3. you register those classes in a service profile
4. a `ServiceManager` activates the profile, with a scheduler and an environment
5. a host binding feeds the scheduler from the host's loop
6. your UI or other application code resolves services and calls them

## The Service Framework environment system

Not every service makes sense on every host. A storage service that uses `localStorage` needs a DOM; a passthrough service needs an XR session. The environment descriptor names the host and carries a set of capability strings. A registration can require capabilities, or supply a rule, and the manager leaves it out when the environment does not qualify.

[Service design](./03_service_design.md) covers capability gating. XR capabilities that change at runtime, such as hand tracking, come through `RuntimeAdapter` instead; [host runtimes](./06_host_runtimes.md) covers that.

## Services and SubServices (service modules) - Advanced

A service can own modules: child services registered inside the parent's registration, created with the parent, started and disposed with it, and able to reach the parent through `parentService`. Use them when a feature belongs to one service instead of standing on its own: a backend adapter for a networking service, an analytics module for a session service, one leaderboard provider per platform.

[Advanced services](./04_advanced_services.md) covers modules in detail.

## Use Cases (and what is a Service anyway?)

A service is a plain class. It is not a React component, not a store, not a global. It says what it needs in its constructor, it has a lifecycle the manager drives, and anything that holds the manager (or a React hook) can resolve it.

### A "Settings" Service

Owns the user's preferences. One implementation persists to `localStorage`; another talks to an account backend. Components call `settings.get("theme")` and never know which.

### A data loading service

Owns the fetches. Cancels them through the abort signal the manager supplies when the service is disposed, so navigating away never leaves a request updating unmounted UI.

### A session manager

Tracks the XR session through `RuntimeAdapter`, publishes visibility changes as events, and pauses work when the headset comes off.

### A Leaderboard service

One service, one module per provider. The service handles authentication; each module knows one backend. The app resolves the module it needs.

## A quick TypeScript glossary

If some of the TypeScript syntax in these pages is unfamiliar, these are the only terms you need:

- `class`: a blueprint for creating an object
- `extends`: says one class builds on another
- `interface`: a type that describes the shape of some data
- `readonly`: a value that should not be reassigned after creation
- `<T>`: a generic type placeholder that lets code stay strongly typed

You do not need to master all of TypeScript before using the framework. The most important idea is that the framework uses types to make service registration and service lookup safer.

## More information

- [Getting started](./02_getting_started.md)
- [Service design](./03_service_design.md)
- [Advanced services](./04_advanced_services.md)
- [Service patterns](./05_service_patterns.md)
- [Host runtimes](./06_host_runtimes.md)
- [Dependency injection](./07_dependency-injection.md)
- [Roadmap](./08_roadmap.md)
- Coming from Unity? [Migrating from Unity](../features/migrating_from_unity.md) maps each concept
