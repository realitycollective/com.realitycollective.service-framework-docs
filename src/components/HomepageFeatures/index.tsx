import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';
import Link from '@docusaurus/Link';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Develop better Unity apps and games',
    Svg: require('@site/static/img/undraw_developer_activity_re_39tg.svg').default,
    description: (
      <>
        The Service Framework helps you maintain a clean architecture and improve performance of your Unity based app or game. <Link to='docs/get-started'>Get started</Link> now!
      </>
    ),
  },
  {
    title: 'Powered by Community',
    Svg: require('@site/static/img/undraw_online_discussion_re_nn7e.svg').default,
    description: (
      <>
        Stuck with a problem or need help with an issue? Join our community over on <a href="https://discord.gg/YjHAQD2XT8">Discord</a> and everyone's happy to help!
      </>
    ),
  },
  {
    title: 'Open Source',
    Svg: require('@site/static/img/undraw_open_source_-1-qxw.svg').default,
    description: (
      <>
        The toolkit is free to use and source code is available on <a href="https://github.com/realitycollective/realitytoolkit.dev">GitHub</a>. Need a feature or found a bug? <a href="https://github.com/realitycollective/realitytoolkit.dev/issues">File an issue or submit a pull request</a>!
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
