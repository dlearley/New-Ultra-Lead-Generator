import { Request, Response } from 'express';
import { pool } from '../config/database';
import { FeatureFlag, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class FeatureFlagController {
  static async getFeatureFlags(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const countResult = await pool.query('SELECT COUNT(*) FROM feature_flags');
      const total = parseInt(countResult.rows[0].count);

      const result = await pool.query(
        `SELECT * FROM feature_flags 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const response: ApiResponse<FeatureFlag[]> = {
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch feature flags'
      });
    }
  }

  static async getFeatureFlag(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM feature_flags WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Feature flag not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching feature flag:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch feature flag'
      });
    }
  }

  static async createFeatureFlag(req: AuthenticatedRequest, res: Response) {
    try {
      const { key, name, description, enabled = false, plans = [], tenantOverrides = [] } = req.body;

      const result = await pool.query(
        `INSERT INTO feature_flags 
         (key, name, description, enabled, plans, tenant_overrides)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [key, name, description, enabled, plans, tenantOverrides]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Feature flag created successfully'
      });
    } catch (error) {
      console.error('Error creating feature flag:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Feature flag with this key already exists'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create feature flag'
      });
    }
  }

  static async updateFeatureFlag(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { key, name, description, enabled, plans, tenantOverrides } = req.body;

      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;

      if (key !== undefined) {
        updateFields.push(`key = $${paramIndex++}`);
        updateValues.push(key);
      }
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      if (enabled !== undefined) {
        updateFields.push(`enabled = $${paramIndex++}`);
        updateValues.push(enabled);
      }
      if (plans !== undefined) {
        updateFields.push(`plans = $${paramIndex++}`);
        updateValues.push(plans);
      }
      if (tenantOverrides !== undefined) {
        updateFields.push(`tenant_overrides = $${paramIndex++}`);
        updateValues.push(tenantOverrides);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const result = await pool.query(
        `UPDATE feature_flags 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Feature flag not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Feature flag updated successfully'
      });
    } catch (error) {
      console.error('Error updating feature flag:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Feature flag with this key already exists'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to update feature flag'
      });
    }
  }

  static async deleteFeatureFlag(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM feature_flags WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Feature flag not found'
        });
      }

      res.json({
        success: true,
        message: 'Feature flag deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting feature flag:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete feature flag'
      });
    }
  }

  static async toggleFeatureFlag(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE feature_flags 
         SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Feature flag not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: `Feature flag ${result.rows[0].enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error toggling feature flag:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle feature flag'
      });
    }
  }

  static async addTenantOverride(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, enabled, value } = req.body;

      const result = await pool.query(
        'SELECT tenant_overrides FROM feature_flags WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Feature flag not found'
        });
      }

      const currentOverrides = result.rows[0].tenant_overrides;
      const existingIndex = currentOverrides.findIndex((override: any) => override.tenantId === tenantId);

      if (existingIndex >= 0) {
        currentOverrides[existingIndex] = { tenantId, enabled, value };
      } else {
        currentOverrides.push({ tenantId, enabled, value });
      }

      const updateResult = await pool.query(
        `UPDATE feature_flags 
         SET tenant_overrides = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [currentOverrides, id]
      );

      res.json({
        success: true,
        data: updateResult.rows[0],
        message: 'Tenant override added successfully'
      });
    } catch (error) {
      console.error('Error adding tenant override:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add tenant override'
      });
    }
  }

  static async removeTenantOverride(req: AuthenticatedRequest, res: Response) {
    try {
      const { id, tenantId } = req.params;

      const result = await pool.query(
        'SELECT tenant_overrides FROM feature_flags WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Feature flag not found'
        });
      }

      const currentOverrides = result.rows[0].tenant_overrides;
      const filteredOverrides = currentOverrides.filter((override: any) => override.tenantId !== tenantId);

      const updateResult = await pool.query(
        `UPDATE feature_flags 
         SET tenant_overrides = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [filteredOverrides, id]
      );

      res.json({
        success: true,
        data: updateResult.rows[0],
        message: 'Tenant override removed successfully'
      });
    } catch (error) {
      console.error('Error removing tenant override:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove tenant override'
      });
    }
  }
}