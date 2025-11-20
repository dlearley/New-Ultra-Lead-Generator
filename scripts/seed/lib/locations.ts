/**
 * Geographic diversity for demo data
 */

export interface LocationData {
  city: string;
  state: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  population: number;
  region: 'Northeast' | 'Southeast' | 'Midwest' | 'Southwest' | 'West';
}

export const MAJOR_US_CITIES: LocationData[] = [
  // Northeast
  {
    city: 'New York',
    state: 'New York',
    stateCode: 'NY',
    latitude: 40.7128,
    longitude: -74.006,
    population: 8336817,
    region: 'Northeast',
  },
  {
    city: 'Boston',
    state: 'Massachusetts',
    stateCode: 'MA',
    latitude: 42.3601,
    longitude: -71.0589,
    population: 692600,
    region: 'Northeast',
  },
  {
    city: 'Philadelphia',
    state: 'Pennsylvania',
    stateCode: 'PA',
    latitude: 39.9526,
    longitude: -75.1652,
    population: 1584064,
    region: 'Northeast',
  },
  {
    city: 'Pittsburgh',
    state: 'Pennsylvania',
    stateCode: 'PA',
    latitude: 40.4406,
    longitude: -79.9959,
    population: 302971,
    region: 'Northeast',
  },
  {
    city: 'Newark',
    state: 'New Jersey',
    stateCode: 'NJ',
    latitude: 40.7357,
    longitude: -74.1724,
    population: 311549,
    region: 'Northeast',
  },

  // Southeast
  {
    city: 'Miami',
    state: 'Florida',
    stateCode: 'FL',
    latitude: 25.7617,
    longitude: -80.1918,
    population: 467963,
    region: 'Southeast',
  },
  {
    city: 'Atlanta',
    state: 'Georgia',
    stateCode: 'GA',
    latitude: 33.749,
    longitude: -84.388,
    population: 498715,
    region: 'Southeast',
  },
  {
    city: 'Charlotte',
    state: 'North Carolina',
    stateCode: 'NC',
    latitude: 35.2271,
    longitude: -80.8431,
    population: 885708,
    region: 'Southeast',
  },
  {
    city: 'Tampa',
    state: 'Florida',
    stateCode: 'FL',
    latitude: 27.9506,
    longitude: -82.4572,
    population: 399700,
    region: 'Southeast',
  },
  {
    city: 'Nashville',
    state: 'Tennessee',
    stateCode: 'TN',
    latitude: 36.1627,
    longitude: -86.7816,
    population: 689447,
    region: 'Southeast',
  },
  {
    city: 'Raleigh',
    state: 'North Carolina',
    stateCode: 'NC',
    latitude: 35.7796,
    longitude: -78.6382,
    population: 467665,
    region: 'Southeast',
  },

  // Midwest
  {
    city: 'Chicago',
    state: 'Illinois',
    stateCode: 'IL',
    latitude: 41.8781,
    longitude: -87.6298,
    population: 2693976,
    region: 'Midwest',
  },
  {
    city: 'Detroit',
    state: 'Michigan',
    stateCode: 'MI',
    latitude: 42.3314,
    longitude: -83.0458,
    population: 639111,
    region: 'Midwest',
  },
  {
    city: 'Columbus',
    state: 'Ohio',
    stateCode: 'OH',
    latitude: 39.9612,
    longitude: -82.9988,
    population: 898553,
    region: 'Midwest',
  },
  {
    city: 'Indianapolis',
    state: 'Indiana',
    stateCode: 'IN',
    latitude: 39.7684,
    longitude: -86.1581,
    population: 876384,
    region: 'Midwest',
  },
  {
    city: 'Milwaukee',
    state: 'Wisconsin',
    stateCode: 'WI',
    latitude: 43.0389,
    longitude: -87.9065,
    population: 577222,
    region: 'Midwest',
  },
  {
    city: 'Kansas City',
    state: 'Missouri',
    stateCode: 'MO',
    latitude: 39.0997,
    longitude: -94.5786,
    population: 508090,
    region: 'Midwest',
  },
  {
    city: 'Minneapolis',
    state: 'Minnesota',
    stateCode: 'MN',
    latitude: 44.9778,
    longitude: -93.265,
    population: 429954,
    region: 'Midwest',
  },

  // Southwest
  {
    city: 'Houston',
    state: 'Texas',
    stateCode: 'TX',
    latitude: 29.7604,
    longitude: -95.3698,
    population: 2320268,
    region: 'Southwest',
  },
  {
    city: 'Dallas',
    state: 'Texas',
    stateCode: 'TX',
    latitude: 32.7767,
    longitude: -96.797,
    population: 1343573,
    region: 'Southwest',
  },
  {
    city: 'Austin',
    state: 'Texas',
    stateCode: 'TX',
    latitude: 30.2672,
    longitude: -97.7431,
    population: 961855,
    region: 'Southwest',
  },
  {
    city: 'San Antonio',
    state: 'Texas',
    stateCode: 'TX',
    latitude: 29.4241,
    longitude: -98.4936,
    population: 1547253,
    region: 'Southwest',
  },
  {
    city: 'Phoenix',
    state: 'Arizona',
    stateCode: 'AZ',
    latitude: 33.4484,
    longitude: -112.074,
    population: 1680992,
    region: 'Southwest',
  },
  {
    city: 'Albuquerque',
    state: 'New Mexico',
    stateCode: 'NM',
    latitude: 35.0844,
    longitude: -106.6504,
    population: 564559,
    region: 'Southwest',
  },

  // West
  {
    city: 'Los Angeles',
    state: 'California',
    stateCode: 'CA',
    latitude: 34.0522,
    longitude: -118.2437,
    population: 3979576,
    region: 'West',
  },
  {
    city: 'San Francisco',
    state: 'California',
    stateCode: 'CA',
    latitude: 37.7749,
    longitude: -122.4194,
    population: 873965,
    region: 'West',
  },
  {
    city: 'San Diego',
    state: 'California',
    stateCode: 'CA',
    latitude: 32.7157,
    longitude: -117.1611,
    population: 1423851,
    region: 'West',
  },
  {
    city: 'San Jose',
    state: 'California',
    stateCode: 'CA',
    latitude: 37.3382,
    longitude: -121.8863,
    population: 1021795,
    region: 'West',
  },
  {
    city: 'Seattle',
    state: 'Washington',
    stateCode: 'WA',
    latitude: 47.6062,
    longitude: -122.3321,
    population: 753675,
    region: 'West',
  },
  {
    city: 'Portland',
    state: 'Oregon',
    stateCode: 'OR',
    latitude: 45.5152,
    longitude: -122.6784,
    population: 654741,
    region: 'West',
  },
  {
    city: 'Denver',
    state: 'Colorado',
    stateCode: 'CO',
    latitude: 39.7392,
    longitude: -104.9903,
    population: 716492,
    region: 'West',
  },
  {
    city: 'Las Vegas',
    state: 'Nevada',
    stateCode: 'NV',
    latitude: 36.1699,
    longitude: -115.1398,
    population: 641903,
    region: 'West',
  },
  {
    city: 'Salt Lake City',
    state: 'Utah',
    stateCode: 'UT',
    latitude: 40.7608,
    longitude: -111.891,
    population: 200567,
    region: 'West',
  },
];

export function getRandomLocation(): LocationData {
  return MAJOR_US_CITIES[Math.floor(Math.random() * MAJOR_US_CITIES.length)];
}

export function getLocationsByRegion(region: LocationData['region']): LocationData[] {
  return MAJOR_US_CITIES.filter((loc) => loc.region === region);
}
