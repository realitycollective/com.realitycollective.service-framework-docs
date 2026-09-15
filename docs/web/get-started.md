---
sidebar_position: 1
sidebar_label: Welcome to the Service Framework for the web
---

# Welcome to the Service Framework for the web

The Service Framework for the web is a small runtime for organising an application as services. One core package holds the manager, lifecycle, dependency injection, events and schedulers. A small binding package for each host (React, three.js, Babylon.js, Meta IWSDK) feeds the core from that host's loop and exposes the host's XR features through one interface. Services are written once against the core and run unchanged on any host.

## Overview

An application built on the framework is a set of services: units of logic with a lifecycle, explicit dependencies and a home that is not a component or a scene. A `ServiceManager` creates them from a profile in the order you declare, drives their lifecycle from whatever loop the host provides, and hands them to anything that asks.

Start with the [introduction](./basics/01_introduction.md) for the concepts, or jump to the [quickstart](#quickstart) below.

## Requirements

- Node 20 or newer for tooling. The packages themselves run in any modern browser.
- A bundler or framework of your choice. The runnable examples use Vite.
- TypeScript is recommended but not required; the packages ship type declarations.

Current release: `1.0.1-preview.8` on npm, published under the `preview` tag from the `development` branch.

### Packages

| Package | What it is |
| --- | --- |
| `@realitycollective/service-framework` | Core runtime: dependency injection, lifecycle, events, schedulers, configuration |
| `@realitycollective/service-framework-react` | React provider and hooks |
| `@realitycollective/service-framework-three` | three.js render-loop bridge and WebXR runtime adapter |
| `@realitycollective/service-framework-babylon` | Babylon.js render-loop bridge and WebXR runtime adapter |
| `@realitycollective/service-framework-iwsdk` | Meta IWSDK (WebXR) frame-source bridge |
| `@realitycollective/service-framework-client` | React and three.js already wired together, so you add services and go |

Each package has its own page under [Host integrations](./integrations/core.md), and the generated [TypeScript API reference](pathname:///api/typescript/) covers every exported symbol.

Pick the core plus the connector for your host:

```sh
# Core only
npm install @realitycollective/service-framework

# Core + React bindings
npm install @realitycollective/service-framework @realitycollective/service-framework-react

# Core + three.js bindings
npm install @realitycollective/service-framework @realitycollective/service-framework-three

# Core + Babylon.js bindings
npm install @realitycollective/service-framework @realitycollective/service-framework-babylon

# Core + Meta IWSDK (WebXR) bindings
npm install @realitycollective/service-framework @realitycollective/service-framework-iwsdk

# Full client (React + three.js composition layer)
npm install @realitycollective/service-framework-client
```

## Use cases

Some of the things a service is good for:

- a settings service that owns persisted preferences, with one implementation on `localStorage` and another against a backend
- a data or weather service that talks to an API and publishes changes to whoever is listening
- a session service that tracks the WebXR session and pauses services when the headset comes off
- a leaderboard or accounts service with a different backend module per provider
- anything you want to test without a browser: construct it, hand it a fake dependency, assert

## Quickstart

Three pieces: a class that implements the service, a token that names it, and a profile that registers it with the manager.

### 1. Creating a service

```ts
import { BaseService, createServiceToken } from "@realitycollective/service-framework";

export class GreetingService extends BaseService {
  public greet(name: string): string {
    return `Hello, ${name}`;
  }
}

// The token is the runtime identity the manager looks the service up by.
// The <GreetingService> type parameter is what makes resolve() return the right type.
export const GREETING_TOKEN = createServiceToken<GreetingService>("GreetingService");
```

### 2. Configuring your service

Registrations live in a profile. `useClass` tells the manager how to construct the service.

```ts
import { createServiceProfile } from "@realitycollective/service-framework";
import { GREETING_TOKEN, GreetingService } from "./greeting-service";

export const profile = createServiceProfile("my-app", [
  { token: GREETING_TOKEN, useClass: GreetingService },
]);
```

### 3. Accessing your running services

```ts
import { ManualScheduler, ServiceManager } from "@realitycollective/service-framework";
import { profile } from "./profile";

// The host decides what drives the scheduler: a timer, a render loop, or an XR frame source.
const manager = new ServiceManager({ scheduler: new ManualScheduler() });
manager.initializeProfile(profile);
manager.start();

manager.resolve(GREETING_TOKEN).greet("world");
```

[Getting started](./basics/02_getting_started.md) walks through the same steps in detail, including how to choose a scheduler, check the manager is ready and inspect what is running.

## Examples and runnable apps

Every package ships a focused example in its `Examples/` folder in the [repository](https://github.com/realitycollective/com.realitycollective.service-framework.ts). Two standalone Vite apps under `runtime-examples/` exercise the same path a published consumer takes:

| App | What it shows | Live |
| --- | --- | --- |
| `weather-client-example` | Teaching-focused walkthrough (matches the [weather client walkthrough](./walkthrough-weather-client.md)) | [service-framework-weather.pages.dev](https://service-framework-weather.pages.dev) |
| `client-runtime-app-example` | Higher-level client runtime reference | [service-framework-client-app.pages.dev](https://service-framework-client-app.pages.dev) |

```sh
cd runtime-examples/weather-client-example
npm install     # resolves the framework from ../../packages via file: deps
npm run dev     # rebuilds the framework first, then serves on https://localhost:5174
```

## What this stack is and is not

The Reality Collective WebXR packages aim at one outcome: an app's logic, input handling, interactions and UI should not care which engine hosts them. Each family ships an engine-free core and thin adapters for Meta IWSDK, plain three.js and WebXR, and Babylon.js. When an app still has to reach into the host, either a contract is missing, which is a bug to report, or the app is overreaching.

Portable world-building is not a current promise. Scene content (meshes, prefabs, placement) is built by the app, ideally behind a factory interface the app owns, so that a second host can implement the same factories.

## Feedback

Questions and problems go to the [Reality Collective Discord](https://discord.gg/YjHAQD2XT8) or the [issue tracker](https://github.com/realitycollective/com.realitycollective.service-framework.ts/issues).

## Documentation

- [Basics](./basics/01_introduction.md): the concepts, one page per topic
- [Features](./features/logging_and_telemetry.md): logging and telemetry, design and decisions
- [Host integrations](./integrations/core.md): one page per npm package
- [Walkthrough: weather client](./walkthrough-weather-client.md): build and deploy a small React app from scratch
- Coming from Unity? [Migrating from Unity](./features/migrating_from_unity.md) maps each concept
