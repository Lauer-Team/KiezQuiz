/** Europe: countries with tiny SVG footprints — chips + enlarged hit targets. */
const EUROPE_MICROSTATES = [
  'Luxemburg',
  'Malta',
  'Andorra',
  'Monaco',
  'San Marino',
  'Liechtenstein',
  'Vatikanstadt'
];

const EUROPE_MICROSTATE_FLAGS = {
  Luxemburg: '🇱🇺',
  Malta: '🇲🇹',
  Andorra: '🇦🇩',
  Monaco: '🇲🇨',
  'San Marino': '🇸🇲',
  Liechtenstein: '🇱🇮',
  Vatikanstadt: '🇻🇦'
};

/** Min path bbox area (SVG units²) before an enlarged tap target is added. */
const EUROPE_MICRO_HIT_MIN_AREA = 220;
const EUROPE_MICRO_HIT_MIN_RADIUS = 20;
const EUROPE_MICRO_HIT_MIN_RADIUS_TOUCH = 28;
