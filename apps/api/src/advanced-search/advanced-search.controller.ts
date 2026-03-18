import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AdvancedSearchService } from './advanced-search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AdvancedSearchInput,
  NaturalLanguageQueryRequest,
  SavedSearchInput,
} from './dto/advanced-search.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Simple decorator for getting current user
interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
}

@Controller('advanced-search')
@UseGuards(JwtAuthGuard)
export class AdvancedSearchController {
  constructor(private readonly advancedSearchService: AdvancedSearchService) {}

  @Post()
  async advancedSearch(
    @Body() input: AdvancedSearchInput,
    @CurrentUser() user: UserPayload
  ) {
    return this.advancedSearchService.advancedSearch(user.organizationId, input);
  }

  @Post('nl')
  async naturalLanguageSearch(
    @Body() request: NaturalLanguageQueryRequest,
    @CurrentUser() user: UserPayload
  ) {
    // Override organizationId from authenticated user
    request.organizationId = user.organizationId;
    return this.advancedSearchService.naturalLanguageSearch(request);
  }

  @Get('suggestions')
  async getSearchSuggestions(
    @Query('q') query: string,
    @Query('type') type: string | undefined,
    @CurrentUser() user: UserPayload
  ) {
    return this.advancedSearchService.getSearchSuggestions(
      user.organizationId,
      query,
      type
    );
  }

  @Get('saved')
  async getSavedSearches(@CurrentUser() user: UserPayload) {
    // TODO: Implement saved search retrieval
    return { savedSearches: [] };
  }

  @Post('saved')
  async saveSearch(
    @Body() input: SavedSearchInput,
    @CurrentUser() user: UserPayload
  ) {
    // TODO: Implement save search
    return { id: 'temp-id', ...input };
  }

  @Get('saved/:id')
  async getSavedSearch(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload
  ) {
    // TODO: Implement get saved search
    return { id };
  }

  @Post('saved/:id/run')
  async runSavedSearch(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload
  ) {
    // TODO: Implement run saved search
    return { id, results: [] };
  }
}
