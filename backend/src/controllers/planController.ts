import { Request, Response } from 'express';
import { pool } from '../config/database';
import { Plan, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class PlanController {
  static async getPlans(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const countResult = await pool.query('SELECT COUNT(*) FROM plans');
      const total = parseInt(countResult.rows[0].count);

      const result = await pool.query(
        `SELECT * FROM plans 
         ORDER BY tier ASC, created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const response: ApiResponse<Plan[]> = {
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
      console.error('Error fetching plans:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch plans'
      });
    }
  }

  static async getPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM plans WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch plan'
      });
    }
  }

  static async createPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, tier, features = [], limits = {}, price = 0, active = true } = req.body;

      const defaultLimits = {
        dataSources: limits.dataSources || 5,
        apiCallsPerMonth: limits.apiCallsPerMonth || 10000,
        storageGB: limits.storageGB || 10,
        users: limits.users || 5
      };

      const result = await pool.query(
        `INSERT INTO plans 
         (name, tier, features, limits, price, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, tier, features, defaultLimits, price, active]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Plan created successfully'
      });
    } catch (error) {
      console.error('Error creating plan:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Plan with this name already exists'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create plan'
      });
    }
  }

  static async updatePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, tier, features, limits, price, active } = req.body;

      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      if (tier !== undefined) {
        updateFields.push(`tier = $${paramIndex++}`);
        updateValues.push(tier);
      }
      if (features !== undefined) {
        updateFields.push(`features = $${paramIndex++}`);
        updateValues.push(features);
      }
      if (limits !== undefined) {
        updateFields.push(`limits = $${paramIndex++}`);
        updateValues.push(limits);
      }
      if (price !== undefined) {
        updateFields.push(`price = $${paramIndex++}`);
        updateValues.push(price);
      }
      if (active !== undefined) {
        updateFields.push(`active = $${paramIndex++}`);
        updateValues.push(active);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const result = await pool.query(
        `UPDATE plans 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Plan updated successfully'
      });
    } catch (error) {
      console.error('Error updating plan:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Plan with this name already exists'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to update plan'
      });
    }
  }

  static async deletePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM plans WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Plan deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete plan'
      });
    }
  }

  static async togglePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE plans 
         SET active = NOT active, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: `Plan ${result.rows[0].active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle plan'
      });
    }
  }

  static async getPlanFeatures(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await pool.query(
        'SELECT DISTINCT unnest(features) as feature FROM plans WHERE active = true ORDER BY feature'
      );

      const features = result.rows.map(row => row.feature);

      res.json({
        success: true,
        data: features
      });
    } catch (error) {
      console.error('Error fetching plan features:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch plan features'
      });
    }
  }

  static async clonePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const sourceResult = await pool.query(
        'SELECT * FROM plans WHERE id = $1',
        [id]
      );

      if (sourceResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Source plan not found'
        });
      }

      const sourcePlan = sourceResult.rows[0];

      const result = await pool.query(
        `INSERT INTO plans 
         (name, tier, features, limits, price, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, sourcePlan.tier, sourcePlan.features, sourcePlan.limits, sourcePlan.price, false]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Plan cloned successfully'
      });
    } catch (error) {
      console.error('Error cloning plan:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Plan with this name already exists'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to clone plan'
      });
    }
  }
}