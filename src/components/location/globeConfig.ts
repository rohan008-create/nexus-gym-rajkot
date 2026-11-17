export const nexusLocation = {
  name: 'NEXUS FITNESS CLUB',
  building: 'Avadh Complex',
  floor: '1st Floor',
  street: 'Dhebar Road',
  landmark: 'Above Anand Medical, Nagrik Bank Chowk',
  area: 'Bhakti Nagar',
  city: 'Rajkot',
  state: 'Gujarat',
  postalCode: '360002',
  country: 'India',
  address: '1st Floor, Avadh Complex, Dhebar Road, Above Anand Medical, Nagrik Bank Chowk, Bhakti Nagar, Rajkot, Gujarat 360002, India',
  phone: '+919558752573',
  phoneDisplay: '+91 95587 52573',
  // Verified coordinates: Yandex Maps Business POI 153622330949 & OpenStreetMap & On-site Facade
  latitude: 22.279650,
  longitude: 70.800109,
  destinationCoordinates: [70.800109, 22.279650] as [number, number],
};

export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${nexusLocation.name}, ${nexusLocation.address}`)}`;

// Camera views
export const earthInitialView = {
  longitude: 78.9629,
  latitude: 20.5937,
  height: 22000000, // 22,000 km altitude showing Earth centered on India
  heading: 0,
  pitch: -90,
  roll: 0,
};

export const destinationView = {
  longitude: 70.800109,
  latitude: 22.279650,
  height: 1200, // 1,200 meters altitude above the gym
  heading: 0,
  pitch: -48, // 48 degree tilt for isometric 3D building perspective
  roll: 0,
};

export const getCesiumIonToken = (): string => {
  if (typeof window !== 'undefined') {
    // Check multiple standard env vars
    const token =
      (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN as string) ||
      (process.env.VITE_CESIUM_ION_TOKEN as string) ||
      (process.env.CESIUM_ION_TOKEN as string) ||
      (window as unknown as { VITE_CESIUM_ION_TOKEN?: string }).VITE_CESIUM_ION_TOKEN ||
      '';
    return token.trim();
  }
  return '';
};
