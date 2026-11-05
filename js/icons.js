// Inline SVG pictograms (24x24, stroke-based). Stroke color comes from CSS
// `currentColor`, so each icon picks up its topic's accent.
const P = {
  // generic / topics
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 12a13 13 0 0 1 10-9 13 13 0 0 1-9 10l-1 3-3-3z"/><circle cx="15" cy="9" r="1.5"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
  exchange: '<path d="M4 8h13l-4-4M20 16H7l4 4"/>',
  plug: '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  check: '<path d="M5 12l5 5L20 7"/>',

  // getting started
  terminal: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l4 3-4 3M12 15h6"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  filter: '<path d="M3 4h18l-7 9v6l-4 2v-8z"/>',

  // storage
  bucket: '<path d="M4 6h16l-2 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><ellipse cx="12" cy="6" rx="8" ry="2.5"/><path d="M8 3.5A4 4 0 0 1 16 3.5"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-5-4-7-5-12-2 2-3 4-3 6-1-1-2-2-2-4-2 2-4 5-4 10 0 4 3 7 7 7z"/><path d="M12 22c-1.7 0-3-1.3-3-3 0-2 3-4 3-6 0 2 3 4 3 6 0 1.7-1.3 3-3 3z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/><circle cx="19" cy="8" r="1"/>',
  sql: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M8 18l-2 2 2 2M16 18l2 2-2 2M13 17l-2 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
  files: '<path d="M8 3h7l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v5h5"/><path d="M4 7v13a2 2 0 0 0 2 2h9"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',

  // compute
  server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6"/>',
  container: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
  lambda: '<path d="M6 4h3l9 16"/><path d="M12.5 10L6 20"/>',
  kube: '<path d="M12 2l8.5 4.5 2 9.5-6 7h-9l-6-7 2-9.5z"/><circle cx="12" cy="12" r="3"/><path d="M12 5v4M12 15v4M5.5 9.5l3.6 1.5M14.9 13l3.6 1.5M5.5 14.5l3.6-1.5M14.9 11l3.6-1.5"/>',
  app: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M7 6h.01M10 6h.01"/><path d="M8 14l2 2 4-4"/>',
  package: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8M7.5 5.5l9 5"/>',
  hammer: '<path d="M14 6l4 4M3 21l9-9"/><path d="M12 4l4-2 6 6-2 4-3-3-3 3-4-4 3-3z"/>',

  // iam
  key: '<circle cx="8" cy="15" r="5"/><path d="M11.5 11.5L21 2M17 6l3 3M15 8l2 2"/>',
  idcard: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5"/><path d="M4.5 17a3.5 3.5 0 0 1 7 0M14 10h5M14 14h3"/>',
  robot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M2 13v3M22 13v3"/>',
  mask: '<path d="M2 9c0-2 2-3 5-3 2 0 3 1 5 1s3-1 5-1c3 0 5 1 5 3 0 5-3 9-6 9-2 0-3-2-4-2s-2 2-4 2c-3 0-6-4-6-9z"/><path d="M7 11h2M15 11h2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  policy: '<path d="M7 3h10l4 4v14H7z"/><path d="M17 3v4h4M3 7v14h4M11 12h6M11 16h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6M11 8v6"/>',

  // data exchange
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>',
  message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/><path d="M8 11h8M8 14h5"/>',
  truck: '<path d="M1 6h13v10H1zM14 10h4l4 4v2h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  stream: '<path d="M2 7c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 13c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 19c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/>',
  flow: '<rect x="2" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M8 6h8M5 9v3h14V9M12 12v3"/>',
  gears: '<circle cx="9" cy="9" r="3"/><path d="M9 2v2M9 14v2M2 9h2M14 9h2M4 4l1.4 1.4M12.6 12.6L14 14M4 14l1.4-1.4M12.6 5.4L14 4"/><circle cx="17" cy="17" r="2.5"/><path d="M17 12.5v1.5M17 20v1.5M12.5 17H14M20 17h1.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4M8 15l2 2 4-4"/>',

  // apis
  toggle: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>',
  apikey: '<circle cx="7.5" cy="12" r="4.5"/><path d="M12 12h10M18 12v3M21 12v2"/>',
  gauge: '<path d="M12 14l4-5"/><path d="M3.5 18a10 10 0 1 1 17 0z"/>',
  gateway: '<path d="M3 21V8l9-5 9 5v13"/><path d="M8 21v-8h8v8M3 12h3M18 12h3"/>',
  curl: '<path d="M8 4c-2 0-3 1-3 3v2c0 1.5-1 2.5-2 3 1 .5 2 1.5 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.5 1 2.5 2 3-1 .5-2 1.5-2 3v2c0 2-1 3-3 3"/><path d="M10 12h.01M14 12h.01"/>',
  // gemini
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/><path d="M5 2l.6 1.4L7 4l-1.4.6L5 6l-.6-1.4L3 4l1.4-.6z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  wand: '<path d="M3 21l12-12M14 4l1-2 1 2 2 1-2 1-1 2-1-2-2-1zM19 10l.7-1.3L21 8l-1.3-.7L19 6l-.7 1.3L17 8l1.3.7z"/><path d="M13 7l4 4"/>',
  python: '<path d="M12 3c-4 0-4 1.8-4 3v2h4v1H6c-2 0-3 1.5-3 4s1 4 3 4h2v-3a3 3 0 0 1 3-3h4a2 2 0 0 0 2-2V6c0-1.5-1-3-5-3z"/><path d="M12 21c4 0 4-1.8 4-3v-2h-4v-1h6c2 0 3-1.5 3-4s-1-4-3-4h-2v3a3 3 0 0 1-3 3H9a2 2 0 0 0-2 2v3c0 1.5 1 3 5 3z"/><path d="M10 5.5h.01M14 18.5h.01"/>',

  // examples
  layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M9 7h7M9 11h5"/>',
  paw: '<circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 12c-3 0-6 4-6 6.5 0 1.5 1.2 2.5 2.7 2.5 1.2 0 2.1-.7 3.3-.7s2.1.7 3.3.7c1.5 0 2.7-1 2.7-2.5C18 16 15 12 12 12z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
};

export function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.terminal}</svg>`;
}
