import { Request, Response } from 'express';
import { pool } from '../config/database';
import { HealthLog, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';
import { WebSocket } from 'ws';

export class HealthController {
  private static wsClients: Set<WebSocket> = new Set();

  static addWebSocketClient(ws: WebSocket) {
    this.wsClients.add(ws);
    ws.on('close', () => this.wsClients.delete(ws));
  }

  static broadcastHealthUpdate(data: any) {
    const message = JSON.stringify({
      type: 'health_update',
      payload: data,
      timestamp: new Date()
    });

    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  static async getHealthLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const { level, dataSourceId, resolved } = req.query;

      let whereClause = '';
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (level) {
        whereClause += ` WHERE level = $${paramIndex++}`;
        queryParams.push(level);
      }

      if (dataSourceId) {
        whereClause += whereClause ? ` AND data_source_id = $${paramIndex++}` : ` WHERE data_source_id = $${paramIndex++}`;
        queryParams.push(dataSourceId);
      }

      if (resolved !== undefined) {
        const isResolved = resolved === 'true';
        whereClause += whereClause ? ` AND resolved = $${paramIndex++}` : ` WHERE resolved = $${paramIndex++}`;
        queryParams.push(isResolved);
      }

      const countQuery = `SELECT COUNT(*) FROM health_logs${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT hl.*, ds.name as data_source_name
        FROM health_logs hl
        LEFT JOIN data_sources ds ON hl.data_source_id = ds.id
        ${whereClause}
        ORDER BY hl.timestamp DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      const result = await pool.query(dataQuery, queryParams);

      const response: ApiResponse<HealthLog[]> = {
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
      console.error('Error fetching health logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch health logs'
      });
    }
  }

  static async getHealthSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const { timeRange = '24h' } = req.query;

      let timeFilter = 'timestamp >= NOW() - INTERVAL \'24 hours\'';
      if (timeRange === '7d') {
        timeFilter = 'timestamp >= NOW() - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'timestamp >= NOW() - INTERVAL \'30 days\'';
      }

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
          COUNT(CASE WHEN level = 'warn' THEN 1 END) as warning_count,
          COUNT(CASE WHEN level = 'info' THEN 1 END) as info_count,
          COUNT(CASE WHEN level = 'debug' THEN 1 END) as debug_count,
          COUNT(CASE WHEN resolved = true THEN 1 END) as resolved_count,
          COUNT(CASE WHEN resolved = false THEN 1 END) as unresolved_count,
          COUNT(DISTINCT data_source_id) as affected_data_sources
        FROM health_logs
        WHERE ${timeFilter}
      `;

      const result = await pool.query(summaryQuery);

      const dataSourceStatusQuery = `
        SELECT 
          ds.id,
          ds.name,
          ds.health_status,
          ds.enabled,
          COUNT(hl.id) as error_count
        FROM data_sources ds
        LEFT JOIN health_logs hl ON ds.id = hl.data_source_id 
          AND hl.level = 'error' 
          AND hl.timestamp >= NOW() - INTERVAL '24 hours'
          AND hl.resolved = false
        GROUP BY ds.id, ds.name, ds.health_status, ds.enabled
        ORDER BY error_count DESC
      `;

      const dataSourceResult = await pool.query(dataSourceStatusQuery);

      const summary = {
        ...result.rows[0],
        dataSources: dataSourceResult.rows
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching health summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch health summary'
      });
    }
  }

  static async getDataSourceHealth(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const dataSourceQuery = `
        SELECT ds.*, 
               COUNT(hl.id) as total_logs,
               COUNT(CASE WHEN hl.level = 'error' AND hl.resolved = false THEN 1 END) as active_errors,
               COUNT(CASE WHEN hl.level = 'warn' AND hl.resolved = false THEN 1 END) as active_warnings
        FROM data_sources ds
        LEFT JOIN health_logs hl ON ds.id = hl.data_source_id 
          AND hl.timestamp >= NOW() - INTERVAL '24 hours'
        WHERE ds.id = $1
        GROUP BY ds.id
      `;

      const result = await pool.query(dataSourceQuery, id);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data source not found'
        });
      }

      const recentLogsQuery = `
        SELECT * FROM health_logs 
        WHERE data_source_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 10
      `;

      const logsResult = await pool.query(recentLogsQuery, id);

      const healthData = {
        ...result.rows[0],
        recentLogs: logsResult.rows
      };

      res.json({
        success: true,
        data: healthData
      });
    } catch (error) {
      console.error('Error fetching data source health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data source health'
      });
    }
  }

  static async createHealthLog(req: AuthenticatedRequest, res: Response) {
    try {
      const { dataSourceId, level, message, details = {} } = req.body;

      const result = await pool.query(
        `INSERT INTO health_logs 
         (data_source_id, level, message, details)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [dataSourceId, level, message, details]
      );

      await this.updateDataSourceHealthStatus(dataSourceId, level);

      this.broadcastHealthUpdate({
        type: 'new_log',
        log: result.rows[0]
      });

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Health log created successfully'
      });
    } catch (error) {
      console.error('Error creating health log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create health log'
      });
    }
  }

  static async resolveHealthLog(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE health_logs 
         SET resolved = true 
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Health log not found'
        });
      }

      await this.updateDataSourceHealthStatus(result.rows[0].data_source_id);

      this.broadcastHealthUpdate({
        type: 'log_resolved',
        log: result.rows[0]
      });

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Health log resolved successfully'
      });
    } catch (error) {
      console.error('Error resolving health log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve health log'
      });
    }
  }

  static async bulkResolveHealthLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid IDs array'
        });
      }

      const result = await pool.query(
        `UPDATE health_logs 
         SET resolved = true 
         WHERE id = ANY($1)
         RETURNING *`,
        [ids]
      );

      const affectedDataSources = [...new Set(result.rows.map(log => log.data_source_id))];
      
      for (const dataSourceId of affectedDataSources) {
        await this.updateDataSourceHealthStatus(dataSourceId);
      }

      this.broadcastHealthUpdate({
        type: 'bulk_resolved',
        count: result.rows.length
      });

      res.json({
        success: true,
        data: result.rows,
        message: `${result.rows.length} health logs resolved successfully`
      });
    } catch (error) {
      console.error('Error bulk resolving health logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk resolve health logs'
      });
    }
  }

  private static async updateDataSourceHealthStatus(dataSourceId: string, newLogLevel?: string) {
    try {
      const errorCountQuery = `
        SELECT COUNT(*) as count 
        FROM health_logs 
        WHERE data_source_id = $1 
          AND level = 'error' 
          AND resolved = false
      `;
      
      const errorResult = await pool.query(errorCountQuery, [dataSourceId]);
      const errorCount = parseInt(errorResult.rows[0].count);

      let status = 'healthy';
      if (errorCount > 5) {
        status = 'unhealthy';
      } else if (errorCount > 0) {
        status = 'degraded';
      }

      const errorRateQuery = `
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN level = 'error' THEN 1 END) as error_logs
        FROM health_logs 
        WHERE data_source_id = $1 
          AND timestamp >= NOW() - INTERVAL '1 hour'
      `;

      const rateResult = await pool.query(errorRateQuery, [dataSourceId]);
      const totalLogs = parseInt(rateResult.rows[0].total_logs);
      const errorLogs = parseInt(rateResult.rows[0].error_logs);
      const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

      await pool.query(
        `UPDATE data_sources 
         SET health_status = $1, 
             last_health_check = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [{ status, errorRate }, dataSourceId]
      );

      this.broadcastHealthUpdate({
        type: 'status_update',
        dataSourceId,
        status: { status, errorRate }
      });
    } catch (error) {
      console.error('Error updating data source health status:', error);
    }
  }

  static async getHealthTrends(req: AuthenticatedRequest, res: Response) {
    try {
      const { period = '7d' } = req.query;

      let interval = 'hour';
      let timeInterval = '7 days';

      if (period === '30d') {
        interval = 'day';
        timeInterval = '30 days';
      } else if (period === '90d') {
        interval = 'week';
        timeInterval = '90 days';
      }

      const trendsQuery = `
        SELECT 
          DATE_TRUNC('${interval}', timestamp) as period,
          level,
          COUNT(*) as count
        FROM health_logs
        WHERE timestamp >= NOW() - INTERVAL '${timeInterval}'
        GROUP BY DATE_TRUNC('${interval}', timestamp), level
        ORDER BY period DESC, level
      `;

      const result = await pool.query(trendsQuery);

      const formattedData = result.rows.reduce((acc: any, row: any) => {
        const period = row.period;
        if (!acc[period]) {
          acc[period] = { period, error: 0, warn: 0, info: 0, debug: 0 };
        }
        acc[period][row.level] = row.count;
        return acc;
      }, {});

      const trends = Object.values(formattedData).reverse();

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Error fetching health trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch health trends'
      });
    }
  }
}