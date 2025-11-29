import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialSchema1704110400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Billing Table
    await queryRunner.createTable(
      new Table({
        name: 'billing',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'plan',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'stripeCustomerId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'stripeSubscriptionId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'monthlySpend',
            type: 'numeric',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'apiCallsUsed',
            type: 'integer',
            default: 0,
          },
          {
            name: 'apiCallsLimit',
            type: 'integer',
            default: 100000,
          },
          {
            name: 'usersCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'projectsCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'trialEndsAt',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'billingCycleStartDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'billingCycleEndDate',
            type: 'date',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'billing',
      new TableIndex({
        name: 'IDX_BILLING_ORGANIZATION_ID',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'billing',
      new TableIndex({
        name: 'IDX_BILLING_STATUS',
        columnNames: ['status'],
      }),
    );

    // Create Usage Metrics Table
    await queryRunner.createTable(
      new Table({
        name: 'usage_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'metricType',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'value',
            type: 'integer',
          },
          {
            name: 'limit',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'cost',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'dateRecorded',
            type: 'date',
          },
        ],
      }),
      true,
    );

    // Create Audit Logs Table
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'resourceType',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'resourceId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'changes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create AI Models Table
    await queryRunner.createTable(
      new Table({
        name: 'ai_models',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'version',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: false,
          },
          {
            name: 'averageLatencyMs',
            type: 'numeric',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'errorRate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalRequests',
            type: 'integer',
            default: 0,
          },
          {
            name: 'failedRequests',
            type: 'integer',
            default: 0,
          },
          {
            name: 'config',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'deployedAt',
            type: 'date',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'ai_models',
      new TableIndex({
        name: 'IDX_AI_MODELS_ORGANIZATION_ID',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'ai_models',
      new TableIndex({
        name: 'IDX_AI_MODELS_PROVIDER',
        columnNames: ['provider'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_models');
    await queryRunner.dropTable('audit_logs');
    await queryRunner.dropTable('usage_metrics');
    await queryRunner.dropTable('billing');
  }
}
