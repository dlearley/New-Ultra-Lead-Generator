import { Controller, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SearchService } from './search.service';
import { BusinessSearchInput } from '@common/dtos/business-search.input';
import { SearchResponseDto } from '@common/dtos/search-response.dto';

@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('businesses')
  @HttpCode(HttpStatus.OK)
  async searchBusinesses(@Body() input: BusinessSearchInput): Promise<SearchResponseDto> {
    return this.searchService.search(input);
  }
}
