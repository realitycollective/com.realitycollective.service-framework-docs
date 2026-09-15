import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import {links} from '@site/src/links';
import styles from './overview.module.css';

// The rungs of the "what is shared" ladder: the same stage on both platforms, with what differs on each side.
const ladder = [
  {
    stage: 'Register',
    unity: 'A profile asset lists configurations; each service is created through its constructor',
    web: (
      <>
        <code>createServiceProfile</code> lists registrations; each service is created through <code>useClass</code>
      </>
    ),
  },
  {stage: 'Initialize, Start', unity: 'Priority order, dependencies first', web: 'Priority order, dependencies first'},
  {
    stage: 'Update, LateUpdate, FixedUpdate',
    unity: "Forwarded from the manager's MonoBehaviour",
    web: 'Scheduler channels driven by the host loop or a render bridge',
  },
  {
    stage: 'Enable, Disable, Reset, Destroy',
    unity: (
      <>
        Same hooks on <code>BaseService</code>
      </>
    ),
    web: (
      <>
        Same hooks on <code>BaseService</code>
      </>
    ),
  },
  {
    stage: 'Pause and focus',
    unity: 'Application pause and focus events',
    web: 'The manager emits pause and focus changes from the host',
  },
  {
    stage: 'Resolve a service',
    unity: 'By interface, through reflection',
    web: (
      <>
        By typed token, <code>createServiceToken</code>
      </>
    ),
  },
  {
    stage: 'Where it may run',
    unity: (
      <>
        Platform classes (<code>IPlatform</code>) gate per build target
      </>
    ),
    web: 'Environment capabilities gate per host',
  },
  {
    stage: 'Sub-services',
    unity: (
      <>
        Service modules on <code>BaseServiceModule</code>
      </>
    ),
    web: (
      <>
        <code>BaseServiceModule&lt;TParent&gt;</code>
      </>
    ),
  },
];

const reasons = [
  {
    number: '01',
    title: 'Dependencies are explicit',
    body: 'A service asks for what it needs in its constructor. The manager satisfies it in order, or fails at startup with the name of what is missing.',
  },
  {
    number: '02',
    title: 'Implementations are swappable',
    body: 'One leaderboard service for Steam, another for PlayStation. Storage for the browser, storage for native. Callers see one interface.',
  },
  {
    number: '03',
    title: 'Logic is testable',
    body: 'Construct a service with fake dependencies and assert on it. No scene, no play mode, no browser.',
  },
];

export default function Overview(): ReactNode {
  return (
    <Layout
      title="Overview"
      description="What the Service Framework is, why you would use it, the two implementations, and what they share.">
      <main className={`sf-dark-nav ${styles.page}`}>
        <section className={styles.band}>
          <div className={styles.introGrid}>
            <div className={styles.introCopy}>
              <span className={styles.eyebrowAccent}>Overview</span>
              <h1 className={styles.title}>What the Service Framework is</h1>
              <p className={styles.leadDark}>
                A way of building an application as services: self-contained pieces of logic with a defined lifecycle,
                registered once with a central manager and resolved anywhere they are needed. It grew out of years of shipping
                XR apps in Unity, where the alternative was singletons, static managers and scripts that only worked in the
                scene they were written in.
              </p>
              <p className={styles.bodyDark}>
                A service is a plain class. It says what it depends on in its constructor. The manager creates it, starts it in
                the right order, drives its lifecycle and hands it to anything that asks. Need a different implementation on a
                different platform? Register a different service. Nothing that uses it changes.
              </p>
            </div>
            <div className={styles.modelGrid}>
              <div className={styles.modelRoot}>
                <div className={styles.modelTitle}>Service model</div>
                <div className={styles.modelSub}>manager · lifecycle · modules · constructor injection · platforms</div>
              </div>
              <div className={styles.modelLeaf}>
                <div className={styles.modelTitle}>Unity</div>
                <div className={styles.modelSub}>C# · editor · any target</div>
              </div>
              <div className={styles.modelLeaf}>
                <div className={styles.modelTitle}>Web</div>
                <div className={styles.modelSub}>TypeScript · React · three.js · Babylon · IWSDK</div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.heading}>Why you would use it</h2>
            <p className={styles.lead}>
              Every project can be held together with a few static managers. The cost arrives later: hidden dependencies, an
              initialisation order nobody wrote down, and logic that cannot be tested without running the whole application.
              The framework replaces that with three guarantees.
            </p>
            <div className={styles.reasons}>
              {reasons.map((r) => (
                <div key={r.number} className={styles.reason}>
                  <span className={styles.reasonNumber}>{r.number}</span>
                  <h3 className={styles.reasonTitle}>{r.title}</h3>
                  <p className={styles.body}>{r.body}</p>
                </div>
              ))}
            </div>
            <p className={styles.body}>
              <strong>Where it pays off:</strong> settings and save data, asset loading, scene or level management,
              leaderboards and accounts, input and interaction, analytics, anything with a platform-specific back end, and
              anything you want to test.
            </p>
          </div>
        </section>

        <section className={styles.sectionTinted}>
          <div className={styles.container}>
            <h2 className={styles.heading}>Two roads, one choice</h2>
            <p className={styles.lead}>
              The framework ships for two platforms. You choose by where your application runs, not by which features you
              want: both carry the full model.
            </p>
            <div className={styles.roads}>
              <div className={styles.road}>
                <span className={styles.eyebrow}>Road one</span>
                <h3 className={styles.roadTitle}>Unity (C#)</h3>
                <p className={styles.body}>
                  The original framework, distributed as a Unity package on OpenUPM. Services are registered through
                  ScriptableObject profiles. Editor tooling creates services from a template, switches the active platform for
                  testing, and shows what is running in play mode. Unity 6 or newer.
                </p>
                <p className={styles.packageName}>
                  <code>com.realitycollective.service-framework</code>
                </p>
                <Link className={styles.roadLink} to="/docs/unity/get-started">
                  Start with Unity →
                </Link>
              </div>
              <div className={styles.road}>
                <span className={styles.eyebrow}>Road two</span>
                <h3 className={styles.roadTitle}>Web (TypeScript)</h3>
                <p className={styles.body}>
                  The same model for browsers and WebXR. A core npm package holds the manager, lifecycle, injection, events
                  and schedulers. A thin connector ties it into React, three.js, Babylon.js or Meta IWSDK. A service written
                  against the core runs unchanged on every host.
                </p>
                <p className={styles.packageName}>
                  <code>@realitycollective/service-framework</code> plus a host package
                </p>
                <Link className={styles.roadLink} to="/docs/web/get-started">
                  Start on the web →
                </Link>
              </div>
            </div>
            <p className={styles.note}>
              Building both? Services port between them by design: the{' '}
              <Link to="/docs/web/features/migrating_from_unity">migration guide</Link> maps each concept one to one.
            </p>
          </div>
        </section>

        <section className={styles.band}>
          <div className={styles.container}>
            <h2 className={styles.headingDark}>What is shared</h2>
            <p className={styles.leadDark}>
              These are not two frameworks that happen to share a name. The principles, the lifecycle and the rules for
              registration and dependencies are the same, implemented twice in the idiom of each language. Read the ladder top
              to bottom: the middle column is identical on both sides.
            </p>
            <div className={styles.ladder} role="table" aria-label="Lifecycle stages shared by both implementations">
              <div className={styles.ladderHeadSide}>Unity (C#)</div>
              <div className={styles.ladderHeadMid}>Shared stage</div>
              <div className={styles.ladderHeadSideRight}>Web (TypeScript)</div>
              {ladder.map((rung) => (
                <div key={rung.stage} className={styles.rung}>
                  <div className={styles.rungSide}>{rung.unity}</div>
                  <div className={styles.rungMid}>{rung.stage}</div>
                  <div className={styles.rungSideRight}>{rung.web}</div>
                </div>
              ))}
            </div>
            <p className={styles.noteDark}>
              The generated <a href="/api">API reference</a> covers both, built from the C# XML documentation and the
              TypeScript declarations. Questions go to the <a href={links.discord}>Reality Collective Discord</a>.
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
