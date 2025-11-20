import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TerritoriesService } from './territories.service';
import { CreateTerritoryDto, UpdateTerritoryDto, TerritoryResponseDto } from '@/common/dtos';

// Mock guard for now - in production, implement proper JWT/auth
class AuthGuard {
  canActivate(context: any): boolean {
    return true;
  }
}

@Controller('api/territories')
@UseGuards(AuthGuard)
export class TerritoriesController {
  constructor(private territoriesService: TerritoriesService) {}

  @Post()
  async create(
    @Req() req: any,
    @Body() createTerritoryDto: CreateTerritoryDto,
  ): Promise<TerritoryResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.territoriesService.create(organizationId, createTerritoryDto);
  }

  @Get()
  async findAll(@Req() req: any): Promise<TerritoryResponseDto[]> {
    const organizationId = req.organizationId || 'default-org';
    return this.territoriesService.findAll(organizationId);
  }

  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<TerritoryResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.territoriesService.findOne(id, organizationId);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateTerritoryDto: UpdateTerritoryDto,
  ): Promise<TerritoryResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.territoriesService.update(id, organizationId, updateTerritoryDto);
  }

  @Delete(':id')
  async delete(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const organizationId = req.organizationId || 'default-org';
    await this.territoriesService.delete(id, organizationId);
    return { message: 'Territory deleted successfully' };
  }

  @Put(':id/assign-owner')
  async assignOwner(
    @Req() req: any,
    @Param('id') id: string,
    @Body('ownerId') ownerId: string,
  ): Promise<TerritoryResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.territoriesService.assignOwner(id, organizationId, ownerId);
  }

  @Put(':id/assign-owners')
  async assignMultipleOwners(
    @Req() req: any,
    @Param('id') id: string,
    @Body('ownerIds') ownerIds: string[],
  ): Promise<TerritoryResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.territoriesService.assignMultipleOwners(id, organizationId, ownerIds);
  }
}
