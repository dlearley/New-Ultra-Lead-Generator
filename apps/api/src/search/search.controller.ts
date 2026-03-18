// apps/api/src/search/search.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { PrismaService } from '../services/prisma.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('businesses')
  async searchBusinesses(
    @Query('q') query: string,
    @Query('industry') industry?: string,
    @Query('location') location?: string,
    @Query('limit') limit: string = '20',
  ) {
    return this.searchService.searchBusinesses({
      query,
      industry,
      location,
      limit: parseInt(limit, 10),
    });
  }

  @Post('businesses/advanced')
  @HttpCode(HttpStatus.OK)
  async advancedSearch(
    @Body() searchInput: {
      query?: string;
      filters?: {
        industry?: string[];
        location?: string;
        minEmployees?: number;
        maxEmployees?: number;
        minRevenue?: number;
        maxRevenue?: number;
      };
      geoLocation?: {
        latitude: number;
        longitude: number;
        radius: number; // in miles
      };
      sort?: {
        field: string;
        order: 'asc' | 'desc';
      };
      pagination?: {
        page: number;
        limit: number;
      };
    },
  ) {
    return this.searchService.advancedSearch(searchInput);
  }

  @Get('suggestions')
  async getSuggestions(@Query('q') query: string) {
    return this.searchService.getSuggestions(query);
  }

  @Get('industries')
  async getIndustries() {
    return this.searchService.getIndustries();
  }

  @Get('locations')
  async getLocations(@Query('q') query?: string) {
    return this.searchService.getLocations(query);
  }
}
