import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ModerationQueue, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class ModerationController {
  static async getModerationQueue(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const { status, entityType } = req.query;

      let whereClause = '';
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (status) {
        whereClause += ` WHERE status = $${paramIndex++}`;
        queryParams.push(status);
      }

      if (entityType) {
        whereClause += whereClause ? ` AND entity_type = $${paramIndex++}` : ` WHERE entity_type = $${paramIndex++}`;
        queryParams.push(entityType);
      }

      const countQuery = `SELECT COUNT(*) FROM moderation_queue${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT mq.*, au.email as moderator_email
        FROM moderation_queue mq
        LEFT JOIN admin_users au ON mq.moderator_id = au.id
        ${whereClause}
        ORDER BY mq.created_at DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      const result = await pool.query(dataQuery, queryParams);

      const response: ApiResponse<ModerationQueue[]> = {
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
      console.error('Error fetching moderation queue:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch moderation queue'
      });
    }
  }

  static async getModerationItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT mq.*, au.email as moderator_email
         FROM moderation_queue mq
         LEFT JOIN admin_users au ON mq.moderator_id = au.id
         WHERE mq.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Moderation item not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching moderation item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch moderation item'
      });
    }
  }

  static async createModerationItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { entityType, entityId, changes } = req.body;

      const result = await pool.query(
        `INSERT INTO moderation_queue 
         (entity_type, entity_id, changes)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [entityType, entityId, changes]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Moderation item created successfully'
      });
    } catch (error) {
      console.error('Error creating moderation item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create moderation item'
      });
    }
  }

  static async approveModerationItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { moderatorNotes } = req.body;

      await pool.query('BEGIN');

      const moderationResult = await pool.query(
        'SELECT * FROM moderation_queue WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (moderationResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Moderation item not found'
        });
      }

      const moderationItem = moderationResult.rows[0];

      await this.applyChanges(moderationItem.entity_type, moderationItem.entity_id, moderationItem.changes);

      const result = await pool.query(
        `UPDATE moderation_queue 
         SET status = 'approved', 
             moderator_id = $1, 
             moderator_notes = $2, 
             reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [req.user?.id, moderatorNotes, id]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Moderation item approved and changes applied successfully'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error approving moderation item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve moderation item'
      });
    }
  }

  static async rejectModerationItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { moderatorNotes } = req.body;

      const result = await pool.query(
        `UPDATE moderation_queue 
         SET status = 'rejected', 
             moderator_id = $1, 
             moderator_notes = $2, 
             reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [req.user?.id, moderatorNotes, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Moderation item not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Moderation item rejected successfully'
      });
    } catch (error) {
      console.error('Error rejecting moderation item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject moderation item'
      });
    }
  }

  private static async applyChanges(entityType: string, entityId: string, changes: any) {
    switch (entityType) {
      case 'profile':
        await this.applyProfileChanges(entityId, changes);
        break;
      case 'data':
        await this.applyDataChanges(entityId, changes);
        break;
      case 'config':
        await this.applyConfigChanges(entityId, changes);
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private static async applyProfileChanges(profileId: string, changes: any) {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(changes)) {
      updateFields.push(`${key} = $${paramIndex++}`);
      updateValues.push(value);
    }

    updateValues.push(profileId);

    await pool.query(
      `UPDATE profiles 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}`,
      updateValues
    );
  }

  private static async applyDataChanges(dataId: string, changes: any) {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(changes)) {
      updateFields.push(`${key} = $${paramIndex++}`);
      updateValues.push(value);
    }

    updateValues.push(dataId);

    await pool.query(
      `UPDATE data_records 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}`,
      updateValues
    );
  }

  private static async applyConfigChanges(configId: string, changes: any) {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(changes)) {
      updateFields.push(`${key} = $${paramIndex++}`);
      updateValues.push(value);
    }

    updateValues.push(configId);

    await pool.query(
      `UPDATE configurations 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}`,
      updateValues
    );
  }

  static async getModerationStats(req: AuthenticatedRequest, res: Response) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_items,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_items,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_items,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as items_last_24h,
          COUNT(CASE WHEN reviewed_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as reviewed_last_24h
        FROM moderation_queue
      `;

      const result = await pool.query(statsQuery);

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch moderation stats'
      });
    }
  }

  static async bulkApprove(req: AuthenticatedRequest, res: Response) {
    try {
      const { ids, moderatorNotes } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid IDs array'
        });
      }

      await pool.query('BEGIN');

      const moderationResult = await pool.query(
        'SELECT * FROM moderation_queue WHERE id = ANY($1) AND status = \'pending\' FOR UPDATE',
        [ids]
      );

      for (const moderationItem of moderationResult.rows) {
        await this.applyChanges(moderationItem.entity_type, moderationItem.entity_id, moderationItem.changes);
      }

      const result = await pool.query(
        `UPDATE moderation_queue 
         SET status = 'approved', 
             moderator_id = $1, 
             moderator_notes = $2, 
             reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ANY($3)
         RETURNING *`,
        [req.user?.id, moderatorNotes, ids]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        data: result.rows,
        message: `${result.rows.length} items approved successfully`
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error bulk approving moderation items:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk approve moderation items'
      });
    }
  }
}