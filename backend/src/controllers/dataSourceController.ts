import { Request, Response } from 'express';
import { pool } from '../config/database';
import { EncryptionService } from '../utils/encryption';
import { DataSource, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class DataSourceController {
  static async getDataSources(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const countResult = await pool.query('SELECT COUNT(*) FROM data_sources');
      const total = parseInt(countResult.rows[0].count);

      const result = await pool.query(
        `SELECT * FROM data_sources 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const dataSources = result.rows.map(row => ({
        ...row,
        credentials: EncryptionService.decryptCredentials(row.credentials)
      }));

      const response: ApiResponse<DataSource[]> = {
        success: true,
        data: dataSources,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching data sources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data sources'
      });
    }
  }

  static async getDataSource(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM data_sources WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data source not found'
        });
      }

      const dataSource = {
        ...result.rows[0],
        credentials: EncryptionService.decryptCredentials(result.rows[0].credentials)
      };

      res.json({
        success: true,
        data: dataSource
      });
    } catch (error) {
      console.error('Error fetching data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data source'
      });
    }
  }

  static async createDataSource(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, type, connector, credentials, rateLimit, enabled = true } = req.body;

      const encryptedCredentials = EncryptionService.encryptCredentials(credentials);

      const defaultRateLimit = rateLimit || {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        currentUsage: { minute: 0, hour: 0, day: 0 }
      };

      const result = await pool.query(
        `INSERT INTO data_sources 
         (name, type, connector, credentials, rate_limit, enabled, health_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [name, type, connector, encryptedCredentials, defaultRateLimit, enabled, {
          status: 'unknown',
          errorRate: 0
        }]
      );

      const dataSource = {
        ...result.rows[0],
        credentials: EncryptionService.decryptCredentials(result.rows[0].credentials)
      };

      res.status(201).json({
        success: true,
        data: dataSource,
        message: 'Data source created successfully'
      });
    } catch (error) {
      console.error('Error creating data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create data source'
      });
    }
  }

  static async updateDataSource(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, connector, credentials, rateLimit, enabled } = req.body;

      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      if (type !== undefined) {
        updateFields.push(`type = $${paramIndex++}`);
        updateValues.push(type);
      }
      if (connector !== undefined) {
        updateFields.push(`connector = $${paramIndex++}`);
        updateValues.push(connector);
      }
      if (credentials !== undefined) {
        const encryptedCredentials = EncryptionService.encryptCredentials(credentials);
        updateFields.push(`credentials = $${paramIndex++}`);
        updateValues.push(encryptedCredentials);
      }
      if (rateLimit !== undefined) {
        updateFields.push(`rate_limit = $${paramIndex++}`);
        updateValues.push(rateLimit);
      }
      if (enabled !== undefined) {
        updateFields.push(`enabled = $${paramIndex++}`);
        updateValues.push(enabled);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const result = await pool.query(
        `UPDATE data_sources 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data source not found'
        });
      }

      const dataSource = {
        ...result.rows[0],
        credentials: EncryptionService.decryptCredentials(result.rows[0].credentials)
      };

      res.json({
        success: true,
        data: dataSource,
        message: 'Data source updated successfully'
      });
    } catch (error) {
      console.error('Error updating data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update data source'
      });
    }
  }

  static async deleteDataSource(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM data_sources WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data source not found'
        });
      }

      res.json({
        success: true,
        message: 'Data source deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete data source'
      });
    }
  }

  static async toggleDataSource(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE data_sources 
         SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data source not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: `Data source ${result.rows[0].enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error toggling data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle data source'
      });
    }
  }
}