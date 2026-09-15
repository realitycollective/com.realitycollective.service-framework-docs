import type {ReactNode} from 'react';

// The "one model, two roads" diagram used on the homepage. Colours are fixed to the dark
// palette because the homepage is always dark, whatever the site theme.
export default function ServiceModelDiagram(): ReactNode {
  const line = '#5b6172';
  const text = '#ffffff';
  const muted = '#b7bcc8';
  const faint = '#8e94a3';
  const panel = '#1c2030';
  const border = '#3a3f4d';
  return (
    <svg
      viewBox="0 0 560 480"
      role="img"
      aria-label="One service model feeding two implementations: Unity in C# and the web in TypeScript"
      style={{display: 'block', width: '100%', maxWidth: 560, height: 'auto'}}
      fontFamily="IBM Plex Sans, Segoe UI, system-ui, sans-serif">
      <defs>
        <marker id="sf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={line} />
        </marker>
      </defs>
      <rect x="150" y="24" width="260" height="120" rx="12" fill={panel} stroke="#FC3848" strokeWidth="2" />
      <text x="280" y="66" textAnchor="middle" fill={text} fontSize="20" fontWeight="600">Service model</text>
      <text x="280" y="94" textAnchor="middle" fill={muted} fontSize="14">manager · lifecycle · modules</text>
      <text x="280" y="116" textAnchor="middle" fill={muted} fontSize="14">constructor injection · platforms</text>
      <path d="M230 144 C 230 210, 120 190, 120 250" fill="none" stroke={line} strokeWidth="2" markerEnd="url(#sf-arrow)" />
      <path d="M330 144 C 330 210, 440 190, 440 250" fill="none" stroke={line} strokeWidth="2" markerEnd="url(#sf-arrow)" />
      <rect x="20" y="256" width="200" height="88" rx="10" fill={panel} stroke={border} />
      <text x="120" y="292" textAnchor="middle" fill={text} fontSize="18" fontWeight="600">Unity</text>
      <text x="120" y="318" textAnchor="middle" fill={muted} fontSize="14">C# · ScriptableObject profiles</text>
      <rect x="340" y="256" width="200" height="88" rx="10" fill={panel} stroke={border} />
      <text x="440" y="292" textAnchor="middle" fill={text} fontSize="18" fontWeight="600">Web</text>
      <text x="440" y="318" textAnchor="middle" fill={muted} fontSize="14">TypeScript · typed profiles</text>
      <g stroke={line} strokeWidth="2">
        <path d="M120 344 V 380" />
        <path d="M440 344 V 380" />
        <path d="M60 380 H 180" />
        <path d="M340 380 H 540" />
        <path d="M60 380 V 394" />
        <path d="M120 380 V 394" />
        <path d="M180 380 V 394" />
        <path d="M352 380 V 394" />
        <path d="M412 380 V 394" />
        <path d="M476 380 V 394" />
        <path d="M540 380 V 394" />
      </g>
      <g fill={faint} fontSize="13">
        <text x="60" y="412" textAnchor="middle">Editor</text>
        <text x="120" y="412" textAnchor="middle">Player</text>
        <text x="180" y="412" textAnchor="middle">Any platform</text>
        <text x="352" y="412" textAnchor="middle">React</text>
        <text x="412" y="412" textAnchor="middle">three.js</text>
        <text x="476" y="412" textAnchor="middle">Babylon.js</text>
        <text x="540" y="412" textAnchor="middle">IWSDK</text>
      </g>
    </svg>
  );
}
