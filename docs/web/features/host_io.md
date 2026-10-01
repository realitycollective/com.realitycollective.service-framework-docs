---
sidebar_position: 4
sidebar_label: "HostIO"
---

# `HostIO`

From 1.0.2.

A browser has `fetch` and `DecompressionStream`. A native host that embeds a bare JavaScript engine, such as Hermes, has neither. `HostIO` is the interface that lets a service read assets the same way on both: a service takes a `HostIO` through its configuration and never reaches for a global, so it does not care which host gave it one.

`HostIO` is transport only. Decoding an image, a sound or a model is the engine's job on both hosts, and stays with the engine. See the asset transparency rule below.

---

## The interface

```ts
interface HostIO {
  /** Read a resource as bytes. Rejects when it cannot be read. */
  fetchBytes(url: string): Promise<Uint8Array>;
  /** Decompress gzip bytes. Rejects when the bytes are not valid gzip. */
  gunzip(bytes: Uint8Array): Promise<Uint8Array>;
}
```

Both methods work on raw bytes. Nothing in `HostIO` knows about JSON, text encoding or image formats; the helpers below build on it for the common cases.

## Implementations

### `createWebHostIO(options?)`

`HostIO` over the browser's `fetch` and `DecompressionStream`. Both globals are read when a method is called, not when the `HostIO` is created, so a host without them fails only if it actually uses them.

```ts
import { createWebHostIO } from "@realitycollective/service-framework";

const io = createWebHostIO();
```

`WebHostIOOptions` lets a test inject its own `fetch` and `DecompressionStream` instead of the real globals.

### `createNativeHostIO(host?)`

`HostIO` over the native host's `io` slice, in `@realitycollective/service-framework-native`. It throws if the host installed no `io`. See [the native integration page](../integrations/native.md#byte-io-the-io-slice).

```ts
import { createNativeHostIO } from "@realitycollective/service-framework-native";

const io = createNativeHostIO();   // reads globalThis.__rcHost.io
```

## Helpers

These build on `HostIO` and work the same way against either implementation.

| Helper | Signature | What it does |
| --- | --- | --- |
| `fetchMaybeGzipped` | `(io: HostIO, url: string) => Promise<Uint8Array>` | Fetches bytes, then gunzips them only if they carry the gzip magic number. Hosts differ on whether they undo a `Content-Encoding: gzip` for you, so this gives the same bytes either way. |
| `fetchText` | `(io: HostIO, url: string) => Promise<string>` | `fetchMaybeGzipped` plus `decodeUtf8`. |
| `fetchJson` | `<T = unknown>(io: HostIO, url: string) => Promise<T>` | `fetchText` plus `JSON.parse`. |
| `decodeUtf8` | `(bytes: Uint8Array) => string` | Decodes UTF-8 with no dependency on `TextDecoder`, which some embedded engines, Hermes among them, lack. Drops a leading byte-order mark; each byte of a malformed sequence decodes to U+FFFD. |
| `isGzip` | `(bytes: Uint8Array) => boolean` | Whether the bytes start with the gzip magic number. |
| `concatBytes` | `(chunks: readonly Uint8Array[]) => Uint8Array` | Joins byte chunks into one array. |

## The asset transparency rule

A `src` string, such as a sky texture, an environment map, an audio cue or a panel config, means the same thing on web and native. The framework ships byte transport, `HostIO`, and never a decoder: the web app decodes an image with the browser's own image loader, and the native app decodes it with its engine's loader. A service that only moves a `src` string around, and hands the bytes to whichever loader its host provides, needs no platform branch.

## Example: a loader written once

```ts
import { fetchJson, type HostIO } from "@realitycollective/service-framework";

interface PanelConfig {
  readonly title: string;
  readonly src: string;
}

export class PanelConfigLoader {
  public constructor(private readonly io: HostIO) {}

  public async load(url: string): Promise<PanelConfig> {
    return fetchJson<PanelConfig>(this.io, url);
  }
}
```

The same `PanelConfigLoader` runs against `createWebHostIO()` in a browser build and against `createNativeHostIO()` in a native build. Nothing in the class knows which one it was given.

## More information

- [Conformance suites](./conformance_suites.md): `hostIOContractCases()`, the suite every `HostIO` implementation must pass
- [Native integration](../integrations/native.md): the native host's `io` slice
