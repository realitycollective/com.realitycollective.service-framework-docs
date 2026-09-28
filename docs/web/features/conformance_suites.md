---
sidebar_position: 5
sidebar_label: "Conformance suites"
---

# Conformance suites

The golden rule behind the framework: a client only ever talks to the core, and the core defines what a platform must implement. That only holds if every platform behaves the same way at each seam. So every seam the core defines ships its own conformance suite: the checks an implementation must pass, published as data rather than kept inside this repository's test files.

The core ships three of them. This page covers those three; the other Reality Collective WebXR families ship one suite per contract of their own, in the same shape.

## The three suites

| Suite | Checks | Cases |
| --- | --- | --- |
| `runtimeAdapterContractCases()` | Every `RuntimeAdapter` implementation: frame delivery, capability reporting and change notification, and the optional session facet's whole lifecycle. | 10 |
| `renderTickContractCases()` | Every binding that emits the scheduler's `renderTick` channel: one tick per frame, frames counted from 1, a stable `source`, and `timestamp` / `deltaTime` in milliseconds. | 5 |
| `hostIOContractCases()` | Every `HostIO` implementation: `fetchBytes` returns served bytes and rejects a missing resource, `gunzip` restores gzipped bytes and rejects non-gzip bytes, and the core's helpers read plain and gzipped JSON alike. | 5 |

### `runtimeAdapterContractCases()` case names

- delivers each frame to every subscriber
- onFrame returns an unsubscribe that stops delivery
- getCapabilities reports exactly the contract capability keys
- onCapabilitiesChange fires once per change and stops after unsubscribe
- session: a fresh adapter starts in the none state
- session: request resolves ok once the host starts a session
- session: end() returns the adapter to the none state
- session: onStateChange returns an unsubscribe that stops delivery
- session: onVisibilityChange returns an unsubscribe that can be called
- session: follows the host when the session ends from the host side

An adapter with no session facet passes the five session cases without running them, because `session` is an optional member of `RuntimeAdapter`.

### `renderTickContractCases()` case names

- emits exactly one renderTick per frame
- counts frames from 1, one at a time
- names its source the same way on every tick
- reports timestamp as the platform clock in milliseconds
- reports deltaTime in milliseconds between frames

### `hostIOContractCases()` case names

- fetchBytes returns the bytes served at a URL
- fetchBytes rejects a URL that cannot be read
- gunzip restores gzipped bytes
- gunzip rejects bytes that are not gzip
- the core helpers read plain and gzipped JSON the same way

## The runner-free shape

Every case is `{ name, run }`: `run` returns silently on success and throws a plain `Error` describing the failure otherwise. Nothing in a case imports a test framework, so any runner, or no runner at all, can host the suite. Some `run` functions are asynchronous, so a caller has to await what they return.

```ts
export interface RuntimeAdapterContractCase {
  name: string;
  run(subject: RuntimeAdapterSubject): void | Promise<void>;
}
```

## Running a suite under vitest

```ts
import { runtimeAdapterContractCases } from "@realitycollective/service-framework";

describe("MyRuntimeAdapter conformance", () => {
  for (const contractCase of runtimeAdapterContractCases()) {
    it(contractCase.name, () => contractCase.run(makeSubject()));
  }
});
```

`makeSubject()` builds a fresh `RuntimeAdapterSubject`: your adapter, plus a driver that pushes a frame and sets capability flags. If your host owns sessions, the driver also starts and ends one. Build a fresh subject per case: the session cases drive a session through its whole lifecycle, so a subject reused across cases starts in the wrong state.

## Running a suite on device, with no runner

The same loop works with no test framework, which is what a native app's embedded engine needs to prove the root `__rcHost` slice on a headset:

```ts
import { hostIOContractCases } from "@realitycollective/service-framework";

const failures: string[] = [];

for (const contractCase of hostIOContractCases()) {
  try {
    await contractCase.run(makeSubject());
    log(`PASS ${contractCase.name}`);
  } catch (error) {
    failures.push(contractCase.name);
    log(`FAIL ${contractCase.name}: ${String(error)}`);
  }
}

if (failures.length > 0) {
  throw new Error(`${String(failures.length)} conformance case(s) failed: ${failures.join(", ")}`);
}
```

## The golden rule

A service that only depends on core contracts, `RuntimeAdapter`, the scheduler's `renderTick` channel and `HostIO`, runs unchanged on every platform that passes these three suites. A platform that fails a case is the thing to fix, never the service. Clients only talk to the core; every platform implements or extends it, and never adds calls of its own.

The IWSDK binding is the reference behaviour, and every other binding is held to it. Where a rule lives in the core, one unit test proves it once. Where a binding applies a rule of its own, such as ticking services only while the session is focused, each binding carries a test of the same name, and the suites above hold every one of them to the same seam. A binding never decides a behaviour the reference has not.

## Host conformance kits

A native app has a fourth seam the web bindings do not: the host itself, which renders, measures and reports. Each WebXR family's native package therefore ships a host conformance kit beside the shared suites, `nativeInteractionsHostConformanceCases()`, `nativeUiHostConformanceCases()` and `nativeEnvironmentHostConformanceCases()`, in the same runner-free shape. A kit drives the real core over the real host and reads back what the host drew, hid, measured or sounded through a small test-readback type, so it runs only on the device, against the real `__rcHost`. This package has no kit of its own, because the root slice carries nothing a host draws; its three suites are what the native app runs on the device for this seam. The kits are documented on the [WebXR native platform page](https://www.realitycollective.net/webxr/docs/concepts/native-platform).

## The wider family

Every other Reality Collective WebXR family ships one conformance suite per contract of its own, in this same runner-free shape: input providers, hit testers, transform ports, window hosts, scene targets, UI Extensions elements, environment ports, audio ports and world-sensing ports. Their suites, and how each family runs them on device, are documented on the [WebXR conformance suites page](https://www.realitycollective.net/webxr/docs/concepts/conformance-suites).
