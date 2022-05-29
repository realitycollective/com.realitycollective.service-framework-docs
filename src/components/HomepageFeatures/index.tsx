import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Made for XR',
    Svg: require('@site/static/img/undraw_augmented_reality_re_f0qd.svg').default,
    description: (
      <>
        The Reality Toolkit was designed from the ground up to aid with mixed reality development. Be it AR, VR or XR,
        the toolkit comes with useful services and components to kickstart your development journey!
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

function Feature({title, Svg, description}: FeatureItem) {
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
