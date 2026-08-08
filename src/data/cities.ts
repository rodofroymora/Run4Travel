import type { City, StartSuggestion } from '../types/routeIntent';

export const CITIES: City[] = [
  {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'España',
    center: { lat: 41.3874, lng: 2.1686 },
    bounds: { minLat: 41.32, maxLat: 41.47, minLng: 2.05, maxLng: 2.25 },
    supported: true,
    locales: ['es-ES', 'ca-ES', 'en-US'],
  },
  {
    id: 'cdmx',
    name: 'Ciudad de México',
    country: 'México',
    center: { lat: 19.4326, lng: -99.1332 },
    bounds: { minLat: 19.25, maxLat: 19.55, minLng: -99.3, maxLng: -99.0 },
    supported: true,
    locales: ['es-MX', 'en-US'],
  },
  {
    id: 'lisboa',
    name: 'Lisboa',
    country: 'Portugal',
    center: { lat: 38.7223, lng: -9.1393 },
    bounds: { minLat: 38.69, maxLat: 38.8, minLng: -9.25, maxLng: -9.08 },
    supported: true,
    locales: ['pt-PT', 'en-US', 'es-ES'],
  },
  {
    id: 'roma',
    name: 'Roma',
    country: 'Italia',
    center: { lat: 41.9028, lng: 12.4964 },
    bounds: { minLat: 41.8, maxLat: 42.0, minLng: 12.35, maxLng: 12.65 },
    supported: true,
    locales: ['it-IT', 'en-US', 'es-ES'],
  },
  {
    id: 'paris',
    name: 'París',
    country: 'Francia',
    center: { lat: 48.8566, lng: 2.3522 },
    bounds: { minLat: 48.8, maxLat: 48.92, minLng: 2.22, maxLng: 2.48 },
    supported: true,
    locales: ['fr-FR', 'en-US', 'es-ES'],
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'Argentina',
    center: { lat: -34.6037, lng: -58.3816 },
    bounds: { minLat: -34.72, maxLat: -34.52, minLng: -58.55, maxLng: -58.3 },
    supported: true,
    locales: ['es-AR', 'en-US'],
  },
  {
    id: 'tokyo',
    name: 'Tokio',
    country: 'Japón',
    center: { lat: 35.6762, lng: 139.6503 },
    bounds: { minLat: 35.55, maxLat: 35.8, minLng: 139.5, maxLng: 139.9 },
    supported: false,
    locales: ['ja-JP', 'en-US'],
  },
];

export const START_SUGGESTIONS: Record<string, StartSuggestion[]> = {
  barcelona: [
    { id: 'bcn-batllo', label: 'Casa Batlló', lat: 41.3916, lng: 2.1649, kind: 'landmark' },
    { id: 'bcn-placa', label: 'Plaça de Catalunya', lat: 41.387, lng: 2.1701, kind: 'plaza' },
    { id: 'bcn-sants', label: 'Estació de Sants', lat: 41.3792, lng: 2.1406, kind: 'station' },
    { id: 'bcn-barceloneta', label: 'Barceloneta', lat: 41.3785, lng: 2.1895, kind: 'landmark' },
    { id: 'bcn-park-guell', label: 'Park Güell', lat: 41.4145, lng: 2.1527, kind: 'landmark' },
  ],
  cdmx: [
    { id: 'cdmx-zocalo', label: 'Zócalo', lat: 19.4326, lng: -99.1332, kind: 'plaza' },
    { id: 'cdmx-reforma', label: 'Ángel de la Independencia', lat: 19.427, lng: -99.1677, kind: 'landmark' },
    { id: 'cdmx-condesa', label: 'Parque México', lat: 19.4117, lng: -99.1695, kind: 'landmark' },
    { id: 'cdmx-roma', label: 'Plaza Río de Janeiro', lat: 19.419, lng: -99.16, kind: 'plaza' },
  ],
  lisboa: [
    { id: 'lis-comercio', label: 'Praça do Comércio', lat: 38.7075, lng: -9.1364, kind: 'plaza' },
    { id: 'lis-belem', label: 'Mosteiro dos Jerónimos', lat: 38.6979, lng: -9.2065, kind: 'landmark' },
    { id: 'lis-oriente', label: 'Estação do Oriente', lat: 38.7679, lng: -9.099, kind: 'station' },
  ],
  roma: [
    { id: 'rom-colosseo', label: 'Colosseo', lat: 41.8902, lng: 12.4922, kind: 'landmark' },
    { id: 'rom-navona', label: 'Piazza Navona', lat: 41.8992, lng: 12.4731, kind: 'plaza' },
    { id: 'rom-termini', label: 'Roma Termini', lat: 41.9009, lng: 12.5018, kind: 'station' },
  ],
  paris: [
    { id: 'par-tour', label: 'Tour Eiffel', lat: 48.8584, lng: 2.2945, kind: 'landmark' },
    { id: 'par-notre', label: 'Notre-Dame', lat: 48.853, lng: 2.3499, kind: 'landmark' },
    { id: 'par-nord', label: 'Gare du Nord', lat: 48.8809, lng: 2.3553, kind: 'station' },
  ],
  'buenos-aires': [
    { id: 'ba-obelisco', label: 'Obelisco', lat: -34.6037, lng: -58.3816, kind: 'landmark' },
    { id: 'ba-san-telmo', label: 'Plaza Dorrego', lat: -34.6205, lng: -58.3715, kind: 'plaza' },
    { id: 'ba-retiro', label: 'Estación Retiro', lat: -34.5912, lng: -58.3745, kind: 'station' },
  ],
};
