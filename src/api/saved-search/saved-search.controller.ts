import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SavedSearchService } from './saved-search.service';
import { CreateSavedSearchDto, UpdateSavedSearchDto, SavedSearchResponseDto } from '@common/dtos/saved-search.dto';

@Controller('api/saved-searches')
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateSavedSearchDto): Promise<SavedSearchResponseDto> {
    return this.savedSearchService.create(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Query('userId') userId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<{ items: SavedSearchResponseDto[]; total: number; hasMore: boolean }> {
    return this.savedSearchService.list(userId, organizationId, skip, take);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(@Param('id') id: string): Promise<SavedSearchResponseDto> {
    return this.savedSearchService.getOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    return this.savedSearchService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.savedSearchService.delete(id);
  }
}
