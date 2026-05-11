import { create } from 'zustand';

interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  ratingAvg: number;
  cylinderListings: {
    size: number;
    fillPrice: number;
    exchangePrice: number;
    stockCount: number;
    isAvailable: boolean;
  }[];
}

interface UserLocationState {
  coords: { lat: number; lng: number } | null;
  locationLabel: string;
  locationState: 'detecting' | 'granted' | 'denied' | 'manual';
  radius: number;
  stations: Station[];
  setCoords: (coords: { lat: number; lng: number }) => void;
  setLocationLabel: (label: string) => void;
  setLocationState: (state: UserLocationState['locationState']) => void;
  setRadius: (radius: number) => void;
  setStations: (stations: Station[]) => void;
}

export const useUserLocationStore = create<UserLocationState>((set) => ({
  coords: null,
  locationLabel: 'Location goes here...',
  locationState: 'detecting',
  radius: 10,
  stations: [],
  setCoords: (coords) => set({ coords }),
  setLocationLabel: (locationLabel) => set({ locationLabel }),
  setLocationState: (locationState) => set({ locationState }),
  setRadius: (radius) => set({ radius }),
  setStations: (stations) => set({ stations }),
}));
