---
sidebar_position: 2
sidebar_label: "Migrating from Unity"
---

# Migration guide: Unity Service Framework to the web

This is the one page in the web documentation that talks about Unity. It maps each Unity concept to its web counterpart, lists what carries over unchanged, and calls out the places where the web framework behaves differently.

## Concept mapping

| Unity framework concept | Web equivalent |
| --- | --- |
| `ServiceManager` | `ServiceManager` |
| `BaseService` / `BaseServiceWithConstructor` | `BaseService<TConfig>` |
| `BaseServiceModule` | `BaseServiceModule<TParent, TConfig>` |
| interface lookup (`GetService<T>()`) | typed service token (`resolve(TOKEN)`) |
| `TryGetService` | `tryResolve` |
| Service Providers Profile asset | `createServiceProfile(name, registrations)` |
| service profile asset per service | `config` object on the registration |
| `Update`, `LateUpdate`, `FixedUpdate` | `update`, `lateUpdate`, `fixedUpdate`, driven by a `TimerScheduler` |
| render callbacks | `render`, driven by a render-loop bridge or adapter |
| `OnApplicationFocus`, `OnApplicationPause` | `onFocusChange`, `onPauseChange`, driven by `manager.emitFocusChange` / `emitPauseChange` |
| `Initialize`, `Start`, `Reset`, `Destroy` | `initialize`, `start`, `reset`, `destroy` |
| EventSystem event services | `BaseEventService<TEvents>` |
| platform classes and runtime platform gating | environment capability strings, `requiredCapabilities` and `enabledWhen` |
| Global Service Manager component in the scene | a `ServiceManager` you construct, or one the React provider owns |
| scene-based service manager | the host binding that feeds the scheduler |
| inspector view of running services | `getDiagnostics()` and `getDependencyGraph()` |
| Unity `Debug.Log` from the framework | the `log` function you give the manager |

## What carries over directly

- central manager pattern
- explicit registration with a name and a priority
- service modules owned by a parent service
- lifecycle-based services with empty defaults you override
- constructor-driven dependency injection declared at registration
- async waiting for framework readiness

## What changes

### Runtime identity

Unity resolves services by interface through reflection. TypeScript interfaces are erased at compile time, so every service has a token created next to its class, and callers resolve through the token.

### Registration order

The rule is the same as Unity's: a dependency must be registered before the service that needs it, by priority and then by profile order. The web manager adds a cycle check before construction, but it does not reorder the profile.

### Lifecycle transport

Unity has one engine loop and the manager forwards its callbacks. The web framework has no loop of its own. The scheduler defines channels, and what emits them depends on the host:

- `TimerScheduler` emits `tick`, `lateTick` and `fixedTick` from timers, which is the only way `update`, `lateUpdate` and `fixedUpdate` fire
- the three.js, Babylon.js and Meta IWSDK bindings emit `renderTick` once per host frame, and nothing else per frame
- only the IWSDK binding raises focus and pause for you; elsewhere the app calls `manager.emitFocusChange` and `emitPauseChange`

A Unity service that did its work in `Update` becomes a web service that does it in `render()` on a renderer host, or in `update()` with a `TimerScheduler`. [Host runtimes](../basics/06_host_runtimes.md) has the full table.

### Host access

A Unity service reaches the engine directly. A web service reaches the host through `RuntimeAdapter`, an interface in the core that each binding implements: per-frame callbacks, XR capability flags and an optional session facet. This is what keeps a service unit-testable with `MockRuntimeAdapter` and portable between renderers.

### Configuration

ScriptableObject profiles become plain objects. Each registration carries a typed `config`; the profile is data and can be composed or loaded from JSON.

### Platform gating

Unity's platform classes become capability strings on an environment descriptor. Note that the manager's default environment has no capabilities, so pass `createBrowserEnvironment()` or your own descriptor when any registration is gated.

### Events

Unity's EventSystem-based event services become `BaseEventService<TEvents>` with a typed event map. Shared state that UI needs to observe is better served by `SnapshotService`, which has no Unity counterpart.

### Coroutines

There are none. Asynchronous work is `async` and should be tied to the service's `abortSignal` so disposal cancels it.

## Suggested migration flow

1. map each Unity service interface to a token
2. move service behaviour into `BaseService` implementations, translating `Update` to `render` or `update` as above
3. translate each profile asset into a registration with a `config` object
4. express constructor dependencies in the registration's `dependencies` array
5. translate platform gating into `requiredCapabilities` or `enabledWhen`
6. replace direct engine access with `RuntimeAdapter`
7. move event plumbing into `BaseEventService` or `SnapshotService`

## Practical advice

- migrate behaviour first, host integration second
- preserve service names and priorities where possible
- keep module boundaries intact
- write the first tests against `ManualScheduler` and `MockRuntimeAdapter` before wiring a real host
- keep React and the renderer as thin consumers of the same core services
