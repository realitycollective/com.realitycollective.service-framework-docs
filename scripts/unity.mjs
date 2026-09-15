// Locates a Unity editor install so DocFX can compile the C# framework against the real
// UnityEngine and UnityEditor assemblies instead of reporting every Unity type as unresolved.
//
//   SF_UNITY_DIR  an editor install root (the folder holding Editor/Data on Windows and Linux,
//                 or Unity.app on macOS), or the Managed folder itself. Set to "none" to skip.
//
// Without the variable, Unity Hub's install locations are searched and the newest editor whose
// major.minor matches the framework's package.json "unity" field is used (else the newest at all).
// CI runners have no Unity, so generation there falls back to allowCompilationErrors.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function managedDirOf(editorRoot) {
  const candidates = [
    path.join(editorRoot, 'Editor', 'Data', 'Managed'),
    path.join(editorRoot, 'Unity.app', 'Contents', 'Managed'),
    path.join(editorRoot, 'Contents', 'Managed'),
    editorRoot,
  ];
  return candidates.find((c) => fs.existsSync(path.join(c, 'UnityEngine.dll'))) ?? null;
}

function builtInPackagesDirOf(managedDir) {
  const candidates = [
    path.join(managedDir, '..', 'Resources', 'PackageManager', 'BuiltInPackages'),
    path.join(managedDir, '..', '..', 'Resources', 'PackageManager', 'BuiltInPackages'),
  ];
  return candidates.map((c) => path.resolve(c)).find((c) => fs.existsSync(c)) ?? null;
}

function hubEditorRoots() {
  const home = os.homedir();
  const roots = [];
  const hubConfigDirs = [
    process.env.APPDATA ? path.join(process.env.APPDATA, 'UnityHub') : null,
    path.join(home, 'Library', 'Application Support', 'UnityHub'),
    path.join(home, '.config', 'UnityHub'),
  ].filter(Boolean);
  for (const dir of hubConfigDirs) {
    const file = path.join(dir, 'secondaryInstallPath.json');
    if (fs.existsSync(file)) {
      try {
        const custom = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (typeof custom === 'string' && custom) {
          roots.push(custom);
        }
      } catch {
        // ignore unreadable hub config
      }
    }
  }
  roots.push(
    'C:\\Program Files\\Unity\\Hub\\Editor',
    '/Applications/Unity/Hub/Editor',
    path.join(home, 'Unity', 'Hub', 'Editor'),
  );
  return roots.filter((r) => fs.existsSync(r));
}

function versionKey(v) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)([abfp])(\d+)/);
  if (!m) {
    return [0, 0, 0, 0, 0];
  }
  const channel = {a: 0, b: 1, f: 3, p: 4}[m[4]] ?? 2;
  return [Number(m[1]), Number(m[2]), Number(m[3]), channel, Number(m[5])];
}

function compareVersions(a, b) {
  const ka = versionKey(a);
  const kb = versionKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) {
      return ka[i] - kb[i];
    }
  }
  return 0;
}

// Returns {version, managedDir, references, extraSources} or null.
export function findUnity(preferredMajorMinor) {
  const override = process.env.SF_UNITY_DIR;
  if (override && override.toLowerCase() === 'none') {
    return null;
  }

  let managedDir = null;
  let version = 'custom';
  if (override) {
    managedDir = managedDirOf(path.resolve(override));
    if (!managedDir) {
      throw new Error(`SF_UNITY_DIR=${override} does not contain UnityEngine.dll (Editor/Data/Managed or Unity.app/Contents/Managed)`);
    }
  } else {
    const installs = [];
    for (const root of hubEditorRoots()) {
      for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
        if (!entry.isDirectory()) {
          continue;
        }
        const managed = managedDirOf(path.join(root, entry.name));
        if (managed) {
          installs.push({version: entry.name, managedDir: managed});
        }
      }
    }
    if (installs.length === 0) {
      return null;
    }
    installs.sort((a, b) => compareVersions(b.version, a.version));
    const match = preferredMajorMinor ? installs.find((i) => i.version.startsWith(preferredMajorMinor + '.')) : null;
    ({version, managedDir} = match ?? installs[0]);
  }

  const references = [
    path.join(managedDir, 'UnityEngine.dll'),
    path.join(managedDir, 'UnityEditor.dll'),
    ...fs
      .readdirSync(path.join(managedDir, 'UnityEngine'))
      .filter((f) => f.endsWith('.dll'))
      .map((f) => path.join(managedDir, 'UnityEngine', f)),
  ].filter((f) => fs.existsSync(f));

  // UnityEngine.EventSystems, UnityEngine.UI and TextMeshPro live in the com.unity.ugui package,
  // which ships as source with the editor.
  const extraSources = [];
  const builtIn = builtInPackagesDirOf(managedDir);
  if (builtIn) {
    const ugui = path.join(builtIn, 'com.unity.ugui', 'Runtime');
    if (fs.existsSync(ugui)) {
      extraSources.push({src: ugui, files: ['**/*.cs'], exclude: ['**/Tests/**', '**/*.Editor/**']});
    }
  }

  return {version, managedDir, references, extraSources, defines: unityDefines(version)};
}

// The scripting defines Unity itself sets for an editor compile of this version, so #if blocks in
// the framework resolve the way they do inside Unity (UNITY_EDITOR, UNITY_2021_1_OR_NEWER, ...).
export function unityDefines(version) {
  const m = version.match(/^(\d+)\.(\d+)/);
  if (!m) {
    return ['UNITY_EDITOR', 'UNITY_5_3_OR_NEWER'];
  }
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const defines = ['UNITY_EDITOR', 'UNITY_EDITOR_64', 'UNITY_EDITOR_WIN', 'UNITY_STANDALONE', 'UNITY_STANDALONE_WIN', 'ENABLE_MONO', 'NET_4_6', 'NET_STANDARD_2_1', 'CSHARP_7_3_OR_NEWER'];
  // Every released major.minor up to this version, as Unity's *_OR_NEWER ladder.
  const ladder = [];
  for (const y of [5, 2017, 2018, 2019, 2020, 2021, 2022, 2023]) {
    const minors = y === 5 ? [3, 4, 5, 6] : y === 2023 ? [1, 2] : [1, 2, 3, 4];
    for (const mi of minors) {
      ladder.push([y, mi]);
    }
  }
  for (let mi = 0; mi <= 20; mi++) {
    ladder.push([6000, mi]);
  }
  for (const [y, mi] of ladder) {
    if (y < major || (y === major && mi <= minor)) {
      defines.push(`UNITY_${y}_${mi}_OR_NEWER`);
    }
  }
  defines.push(`UNITY_${major}_${minor}`, `UNITY_${major}`);
  return defines;
}
