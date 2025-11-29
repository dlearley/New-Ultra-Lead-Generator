import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AiModelService } from '../services/ai-model.service';
import {
  CreateAiModelDto,
  UpdateAiModelDto,
  ToggleAiProviderDto,
  SwitchActiveModelDto,
  AiModelResponseDto,
  AiModelMetricsDto,
} from '../dtos/ai-model.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { GetUser } from '../decorators/get-user.decorator';

@Controller('admin/ai-models')
@UseGuards(JwtAuthGuard)
export class AiModelController {
  constructor(private aiModelService: AiModelService) {}

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:create')
  @HttpCode(201)
  async createModel(
    @Body() dto: CreateAiModelDto,
    @GetUser() user: any,
  ): Promise<AiModelResponseDto> {
    return this.aiModelService.createModel(dto, user?.id);
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:read')
  async getModel(@Param('id') id: string): Promise<AiModelResponseDto> {
    return this.aiModelService.getModelById(id);
  }

  @Get('organization/:organizationId/all')
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:read')
  async getOrganizationModels(
    @Param('organizationId') organizationId: string,
  ): Promise<AiModelResponseDto[]> {
    return this.aiModelService.getModelsByOrganization(organizationId);
  }

  @Get('organization/:organizationId/active')
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:read')
  async getActiveModel(
    @Param('organizationId') organizationId: string,
  ): Promise<AiModelResponseDto> {
    return this.aiModelService.getActiveModel(organizationId);
  }

  @Put(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:update')
  async updateModel(
    @Param('id') id: string,
    @Body() dto: UpdateAiModelDto,
    @GetUser() user: any,
  ): Promise<AiModelResponseDto> {
    return this.aiModelService.updateModel(id, dto, user?.id);
  }

  @Post('switch-active')
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:update')
  async switchActiveModel(
    @Body() dto: SwitchActiveModelDto,
    @GetUser() user: any,
  ): Promise<AiModelResponseDto> {
    const model = await this.aiModelService.getModelById(dto.modelId);
    return this.aiModelService.switchActiveModel(model.organizationId, dto.modelId, user?.id);
  }

  @Post('toggle-provider')
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:update')
  async toggleProvider(
    @Body() dto: ToggleAiProviderDto,
    @GetUser() user: any,
  ) {
    // This needs organization context from token or header
    // Implementation depends on how organization is passed
    return { message: 'Provider toggle requires organization context' };
  }

  @Get('organization/:organizationId/metrics')
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:read')
  async getModelMetrics(
    @Param('organizationId') organizationId: string,
  ): Promise<AiModelMetricsDto[]> {
    return this.aiModelService.getModelMetrics(organizationId);
  }

  @Post(':id/record-metrics')
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:update')
  @HttpCode(204)
  async recordModelMetrics(
    @Param('id') id: string,
    @Body() body: { latencyMs: number; success: boolean },
  ): Promise<void> {
    await this.aiModelService.recordModelMetrics(id, body.latencyMs, body.success);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequirePermission('ai-model:delete')
  @HttpCode(204)
  async deleteModel(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<void> {
    await this.aiModelService.deleteModel(id, user?.id);
  }
}
