import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CustomFieldsService, CustomFieldType } from './custom-fields.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
export class CustomFieldsController {
  constructor(private readonly customFields: CustomFieldsService) {}

  // ============================================================
  // FIELD MANAGEMENT
  // ============================================================

  @Post()
  async createField(
    @CurrentUser() user: UserPayload,
    @Body() data: {
      name: string;
      apiName: string;
      type: CustomFieldType;
      description?: string;
      required?: boolean;
      defaultValue?: any;
      options?: string[];
      entityType: 'contact' | 'company' | 'deal';
    },
  ) {
    return this.customFields.createField(user.organizationId, data);
  }

  @Get()
  async getFields(
    @CurrentUser() user: UserPayload,
    @Query('entityType') entityType?: 'contact' | 'company' | 'deal',
    @Query('isActive') isActive?: string,
  ) {
    return this.customFields.getFields(user.organizationId, {
      entityType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  async getField(
    @CurrentUser() user: UserPayload,
    @Param('id') fieldId: string,
  ) {
    return this.customFields.getField(user.organizationId, fieldId);
  }

  @Put(':id')
  async updateField(
    @CurrentUser() user: UserPayload,
    @Param('id') fieldId: string,
    @Body() data: Partial<{
      name: string;
      description: string;
      required: boolean;
      defaultValue: any;
      options: string[];
      isActive: boolean;
      order: number;
    }>,
  ) {
    return this.customFields.updateField(user.organizationId, fieldId, data);
  }

  @Delete(':id')
  async deleteField(
    @CurrentUser() user: UserPayload,
    @Param('id') fieldId: string,
  ) {
    await this.customFields.deleteField(user.organizationId, fieldId);
    return { success: true };
  }

  // ============================================================
  // FIELD VALUES
  // ============================================================

  @Post(':id/values/:entityId')
  async setFieldValue(
    @CurrentUser() user: UserPayload,
    @Param('id') fieldId: string,
    @Param('entityId') entityId: string,
    @Body() data: { value: any },
  ) {
    await this.customFields.setFieldValue(user.organizationId, fieldId, entityId, data.value);
    return { success: true };
  }

  @Get(':id/values/:entityId')
  async getFieldValue(
    @CurrentUser() user: UserPayload,
    @Param('id') fieldId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.customFields.getFieldValue(user.organizationId, fieldId, entityId);
  }

  @Delete(':id/values/:entityId')
  async deleteFieldValue(
    @CurrentUser() user: UserPayload,
    @Param('id') fieldId: string,
    @Param('entityId') entityId: string,
  ) {
    await this.customFields.deleteFieldValue(user.organizationId, fieldId, entityId);
    return { success: true };
  }

  // ============================================================
  // ENTITY CUSTOM FIELDS
  // ============================================================

  @Get('entity/:entityType/:entityId')
  async getEntityCustomFields(
    @CurrentUser() user: UserPayload,
    @Param('entityType') entityType: 'contact' | 'company' | 'deal',
    @Param('entityId') entityId: string,
  ) {
    return this.customFields.getEntityCustomFields(user.organizationId, entityType, entityId);
  }

  @Post('entity/:entityType/:entityId')
  async setMultipleFieldValues(
    @CurrentUser() user: UserPayload,
    @Param('entityType') entityType: 'contact' | 'company' | 'deal',
    @Param('entityId') entityId: string,
    @Body() data: { values: Record<string, any> },
  ) {
    await this.customFields.setMultipleFieldValues(
      user.organizationId,
      entityType,
      entityId,
      data.values,
    );
    return { success: true };
  }

  // ============================================================
  // STATS
  // ============================================================

  @Get(':id/stats')
  async getFieldStats(
    @CurrentUser() user: UserPayload,
    @Param('id') fieldId: string,
  ) {
    return this.customFields.getFieldStats(user.organizationId, fieldId);
  }
}
