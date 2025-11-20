import { Injectable } from '@nestjs/common';
import { OpenSearchService } from './opensearch.service';
import { BusinessSearchInput } from '@common/dtos/business-search.input';
import { SearchResponseDto } from '@common/dtos/search-response.dto';
import { GeocodingService } from '@common/services/geocoding.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly openSearchService: OpenSearchService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async search(input: BusinessSearchInput): Promise<SearchResponseDto> {
    // If address-based geo search, geocode it first
    if (input.geoLocation?.address && !input.geoLocation.latitude) {
      const coords = await this.geocodingService.geocodeAddress(input.geoLocation.address);
      if (coords) {
        input.geoLocation.latitude = coords.latitude;
        input.geoLocation.longitude = coords.longitude;
      }
    }

    return this.openSearchService.search(input);
  }
}
