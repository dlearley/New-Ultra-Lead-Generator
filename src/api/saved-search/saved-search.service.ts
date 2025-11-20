import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedSearch } from '@database/entities/saved-search.entity';
import { CreateSavedSearchDto, UpdateSavedSearchDto, SavedSearchResponseDto } from '@common/dtos/saved-search.dto';

@Injectable()
export class SavedSearchService {
  constructor(
    @InjectRepository(SavedSearch)
    private savedSearchRepository: Repository<SavedSearch>,
  ) {}

  async create(createDto: CreateSavedSearchDto): Promise<SavedSearchResponseDto> {
    if (!createDto.query || Object.keys(createDto.query).length === 0) {
      throw new BadRequestException('Query is required');
    }

    const savedSearch = this.savedSearchRepository.create({
      name: createDto.name,
      description: createDto.description,
      userId: createDto.userId,
      organizationId: createDto.organizationId,
      query: createDto.query,
      filters: createDto.filters,
    });

    const saved = await this.savedSearchRepository.save(savedSearch);
    return this.mapToResponseDto(saved);
  }

  async list(
    userId?: string,
    organizationId?: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ items: SavedSearchResponseDto[]; total: number; hasMore: boolean }> {
    const query = this.savedSearchRepository.createQueryBuilder('search');

    if (userId) {
      query.where('search.userId = :userId', { userId });
    }

    if (organizationId) {
      query.andWhere('search.organizationId = :organizationId', { organizationId });
    }

    query.orderBy('search.createdAt', 'DESC').skip(skip).take(take);

    const [items, total] = await query.getManyAndCount();

    return {
      items: items.map((item) => this.mapToResponseDto(item)),
      total,
      hasMore: skip + take < total,
    };
  }

  async getOne(id: string): Promise<SavedSearchResponseDto> {
    const savedSearch = await this.savedSearchRepository.findOne({ where: { id } });

    if (!savedSearch) {
      throw new NotFoundException(`Saved search with id ${id} not found`);
    }

    return this.mapToResponseDto(savedSearch);
  }

  async update(id: string, updateDto: UpdateSavedSearchDto): Promise<SavedSearchResponseDto> {
    const savedSearch = await this.savedSearchRepository.findOne({ where: { id } });

    if (!savedSearch) {
      throw new NotFoundException(`Saved search with id ${id} not found`);
    }

    if (updateDto.name !== undefined) {
      savedSearch.name = updateDto.name;
    }

    if (updateDto.description !== undefined) {
      savedSearch.description = updateDto.description;
    }

    if (updateDto.query !== undefined) {
      savedSearch.query = updateDto.query;
    }

    if (updateDto.filters !== undefined) {
      savedSearch.filters = updateDto.filters;
    }

    const updated = await this.savedSearchRepository.save(savedSearch);
    return this.mapToResponseDto(updated);
  }

  async delete(id: string): Promise<void> {
    const result = await this.savedSearchRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Saved search with id ${id} not found`);
    }
  }

  private mapToResponseDto(entity: SavedSearch): SavedSearchResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      userId: entity.userId,
      organizationId: entity.organizationId,
      query: entity.query,
      filters: entity.filters,
      resultsCount: entity.resultsCount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
