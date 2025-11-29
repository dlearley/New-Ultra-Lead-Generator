import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create businesses table
    await queryRunner.createTable(
      new Table({
        name: 'businesses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'industry',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'latitude',
            type: 'numeric',
            precision: 10,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'longitude',
            type: 'numeric',
            precision: 11,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'revenue',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'employees',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'hiring',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'techStack',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create indexes on businesses table
    await queryRunner.createIndex(
      'businesses',
      new TableIndex({
        name: 'IDX_BUSINESSES_NAME',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'businesses',
      new TableIndex({
        name: 'IDX_BUSINESSES_INDUSTRY',
        columnNames: ['industry'],
      }),
    );

    await queryRunner.createIndex(
      'businesses',
      new TableIndex({
        name: 'IDX_BUSINESSES_LOCATION',
        columnNames: ['location'],
      }),
    );

    await queryRunner.createIndex(
      'businesses',
      new TableIndex({
        name: 'IDX_BUSINESSES_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );

    // Create saved_searches table
    await queryRunner.createTable(
      new Table({
        name: 'saved_searches',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'query',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'filters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'resultsCount',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create indexes on saved_searches table
    await queryRunner.createIndex(
      'saved_searches',
      new TableIndex({
        name: 'IDX_SAVED_SEARCHES_USER_ID',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'saved_searches',
      new TableIndex({
        name: 'IDX_SAVED_SEARCHES_ORG_ID',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'saved_searches',
      new TableIndex({
        name: 'IDX_SAVED_SEARCHES_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('saved_searches', 'IDX_SAVED_SEARCHES_CREATED_AT');
    await queryRunner.dropIndex('saved_searches', 'IDX_SAVED_SEARCHES_ORG_ID');
    await queryRunner.dropIndex('saved_searches', 'IDX_SAVED_SEARCHES_USER_ID');

    await queryRunner.dropIndex('businesses', 'IDX_BUSINESSES_CREATED_AT');
    await queryRunner.dropIndex('businesses', 'IDX_BUSINESSES_LOCATION');
    await queryRunner.dropIndex('businesses', 'IDX_BUSINESSES_INDUSTRY');
    await queryRunner.dropIndex('businesses', 'IDX_BUSINESSES_NAME');

    // Drop tables
    await queryRunner.dropTable('saved_searches');
    await queryRunner.dropTable('businesses');
  }
}
