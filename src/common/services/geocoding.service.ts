import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // Mock implementation - in production, integrate with a real geocoding API
      // e.g., Google Maps Geocoding API, Mapbox, etc.
      this.logger.log(`Geocoding address: ${address}`);

      // For now, return mock coordinates based on address
      const mockCoordinates: { [key: string]: { latitude: number; longitude: number } } = {
        'san francisco': { latitude: 37.7749, longitude: -122.4194 },
        'new york': { latitude: 40.7128, longitude: -74.006 },
        'los angeles': { latitude: 34.0522, longitude: -118.2437 },
        'chicago': { latitude: 41.8781, longitude: -87.6298 },
        'seattle': { latitude: 47.6062, longitude: -122.3321 },
      };

      const normalizedAddress = address.toLowerCase();
      return mockCoordinates[normalizedAddress] || null;
    } catch (error) {
      this.logger.error(`Error geocoding address: ${error.message}`);
      return null;
    }
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
