import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Territory } from '@/database/entities';
import { CreateTerritoryDto, UpdateTerritoryDto, TerritoryResponseDto } from '@/common/dtos';

@Injectable()
export class TerritoriesService {
  constructor(
    @InjectRepository(Territory)
    private territoriesRepository: Repository<Territory>,
  ) {}

  async create(
    organizationId: string,
    createTerritoryDto: CreateTerritoryDto,
  ): Promise<TerritoryResponseDto> {
    const territory = this.territoriesRepository.create({
      organizationId,
      ...createTerritoryDto,
    });

    const saved = await this.territoriesRepository.save(territory);
    return this.toResponseDto(saved);
  }

  async findAll(organizationId: string): Promise<TerritoryResponseDto[]> {
    const territories = await this.territoriesRepository.find({
      where: { organizationId, isActive: true },
      relations: ['owner'],
    });

    return territories.map((t) => this.toResponseDto(t));
  }

  async findOne(id: string, organizationId: string): Promise<TerritoryResponseDto> {
    const territory = await this.territoriesRepository.findOne({
      where: { id, organizationId },
      relations: ['owner'],
    });

    if (!territory) {
      throw new NotFoundException(`Territory with id ${id} not found`);
    }

    return this.toResponseDto(territory);
  }

  async update(
    id: string,
    organizationId: string,
    updateTerritoryDto: UpdateTerritoryDto,
  ): Promise<TerritoryResponseDto> {
    const territory = await this.findOne(id, organizationId);

    await this.territoriesRepository.update(
      { id, organizationId },
      updateTerritoryDto,
    );

    return this.findOne(id, organizationId);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.territoriesRepository.update(
      { id, organizationId },
      { isActive: false },
    );

    if (result.affected === 0) {
      throw new NotFoundException(`Territory with id ${id} not found`);
    }
  }

  async assignOwner(
    id: string,
    organizationId: string,
    ownerId: string,
  ): Promise<TerritoryResponseDto> {
    const territory = await this.findOne(id, organizationId);

    await this.territoriesRepository.update(
      { id, organizationId },
      { ownerId },
    );

    return this.findOne(id, organizationId);
  }

  async assignMultipleOwners(
    id: string,
    organizationId: string,
    ownerIds: string[],
  ): Promise<TerritoryResponseDto> {
    const territory = await this.findOne(id, organizationId);

    await this.territoriesRepository.update(
      { id, organizationId },
      { ownerIds },
    );

    return this.findOne(id, organizationId);
  }

  private toResponseDto(territory: Territory): TerritoryResponseDto {
    return {
      id: territory.id,
      organizationId: territory.organizationId,
      name: territory.name,
      type: territory.type,
      polygonCoordinates: territory.polygonCoordinates,
      radiusGeometry: territory.radiusGeometry,
      stateCode: territory.stateCode,
      countyCode: territory.countyCode,
      ownerId: territory.ownerId,
      ownerIds: territory.ownerIds,
      isActive: territory.isActive,
      createdAt: territory.createdAt,
      updatedAt: territory.updatedAt,
    };
  }
}
