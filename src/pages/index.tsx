import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import ServiceModelDiagram from '@site/src/components/ServiceModelDiagram';
import {links} from '@site/src/links';
import styles from './index.module.css';

const reasons = [
  {
    number: '01',
    title: 'Dependencies you can see',
    body: 'A service declares what it needs in its constructor. The manager builds in order, or tells you what is missing.',
  },
  {
    number: '02',
    title: 'Swap the implementation',
    body: 'A different service per platform, chosen at registration. The code that uses it never changes.',
  },
  {
    number: '03',
    title: 'Test it like plain code',
    body: 'Construct the service, hand it a fake dependency, assert. No scene, no play mode, no browser.',
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="One service model. Unity or the web."
      description="The Service Framework: services with a lifecycle and explicit dependencies for Unity (C#) and the web (TypeScript), by the Reality Collective.">
      <main className={`sf-dark-nav ${styles.page}`}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.title}>
              One service model.
              <br />
              Unity or the web.
            </h1>
            <p className={styles.lead}>
              Structure your application as services: units of logic with a lifecycle, explicit dependencies and a home that
              is not a scene. Write against the model once. Ship it in C# for Unity, or in TypeScript for React, three.js,
              Babylon.js and Meta IWSDK.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} to="/overview">
                Get Started
              </Link>
              <a className={styles.secondary} href={links.discord}>
                Join Discord
              </a>
            </div>
            <div className={styles.repoLinks}>
              <a href={links.githubUnity}>GitHub: Unity (C#)</a>
              <a href={links.githubWeb}>GitHub: Web (TypeScript)</a>
              <a href={links.licence}>MIT licence</a>
            </div>
          </div>
          <div className={styles.heroArt}>
            <ServiceModelDiagram />
          </div>
        </section>

        <section className={styles.reasons}>
          {reasons.map((r) => (
            <div key={r.number} className={styles.reason}>
              <span className={styles.reasonNumber}>{r.number}</span>
              <h3 className={styles.reasonTitle}>{r.title}</h3>
              <p className={styles.reasonBody}>{r.body}</p>
            </div>
          ))}
        </section>

        <section className={styles.roads}>
          <div className={styles.road}>
            <span className={styles.eyebrow}>Road one</span>
            <h3 className={styles.roadTitle}>Unity (C#)</h3>
            <p className={styles.roadBody}>
              Profiles as ScriptableObjects, a service wizard, a platform switcher and a live view of running services. Unity 6
              or newer, from OpenUPM.
            </p>
            <Link className={styles.roadLink} to="/docs/unity/get-started">
              Start with Unity →
            </Link>
          </div>
          <div className={styles.road}>
            <span className={styles.eyebrow}>Road two</span>
            <h3 className={styles.roadTitle}>Web (TypeScript)</h3>
            <p className={styles.roadBody}>
              A core npm package plus a thin connector for React, three.js, Babylon.js or Meta IWSDK. Services run unchanged
              on every host.
            </p>
            <Link className={styles.roadLink} to="/docs/web/get-started">
              Start on the web →
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
