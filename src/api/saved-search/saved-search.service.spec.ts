import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SavedSearchService } from './saved-search.service';
import { SavedSearch } from '@database/entities/saved-search.entity';
import { CreateSavedSearchDto } from '@common/dtos/saved-search.dto';

describe('SavedSearchService', () => {
  let service: SavedSearchService;
  let repository: Repository<SavedSearch>;

  const mockSavedSearch = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Search',
    description: 'Test Description',
    userId: 'user-123',
    organizationId: 'org-123',
    query: { query: 'test' },
    filters: { industry: 'tech' },
    resultsCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedSearchService,
        {
          provide: getRepositoryToken(SavedSearch),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SavedSearchService>(SavedSearchService);
    repository = module.get<Repository<SavedSearch>>(getRepositoryToken(SavedSearch));
  });

  describe('create', () => {
    it('should create a saved search', async () => {
      const createDto: CreateSavedSearchDto = {
        name: 'Test Search',
        description: 'Test Description',
        userId: 'user-123',
        organizationId: 'org-123',
        query: { query: 'test' },
        filters: { industry: 'tech' },
      };

      jest.spyOn(repository, 'create').mockReturnValue(mockSavedSearch as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockSavedSearch as any);

      const result = await service.create(createDto);

      expect(result.name).toBe(createDto.name);
      expect(result.query).toEqual(createDto.query);
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining(createDto));
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when query is empty', async () => {
      const createDto: CreateSavedSearchDto = {
        name: 'Test Search',
        query: {},
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOne', () => {
    it('should return a saved search', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockSavedSearch as any);

      const result = await service.getOne('550e8400-e29b-41d4-a716-446655440000');

      expect(result.name).toBe(mockSavedSearch.name);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a saved search', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedEntity = { ...mockSavedSearch, ...updateDto };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockSavedSearch as any);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedEntity as any);

      const result = await service.update('550e8400-e29b-41d4-a716-446655440000', updateDto);

      expect(result.name).toBe('Updated Name');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent search', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a saved search', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await service.delete('550e8400-e29b-41d4-a716-446655440000');

      expect(repository.delete).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should throw NotFoundException when deleting non-existent search', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 0 } as any);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('should list saved searches with filters', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockSavedSearch], 1]),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.list('user-123', 'org-123', 0, 20);

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });
});
