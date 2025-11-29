import { Request, Response } from 'express';
import { pool } from '../config/database';
import { DataQualityMetrics, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class DataQualityController {
  static async getDataQualityMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const { region, industry, dataSourceId } = req.query;

      let whereClause = '';
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (region) {
        whereClause += ` WHERE region = $${paramIndex++}`;
        queryParams.push(region);
      }

      if (industry) {
        whereClause += whereClause ? ` AND industry = $${paramIndex++}` : ` WHERE industry = $${paramIndex++}`;
        queryParams.push(industry);
      }

      if (dataSourceId) {
        whereClause += whereClause ? ` AND data_source_id = $${paramIndex++}` : ` WHERE data_source_id = $${paramIndex++}`;
        queryParams.push(dataSourceId);
      }

      const countQuery = `SELECT COUNT(*) FROM data_quality_metrics${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT dqm.*, ds.name as data_source_name 
        FROM data_quality_metrics dqm
        LEFT JOIN data_sources ds ON dqm.data_source_id = ds.id
        ${whereClause}
        ORDER BY dqm.last_updated DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      const result = await pool.query(dataQuery, queryParams);

      const response: ApiResponse<DataQualityMetrics[]> = {
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
      console.error('Error fetching data quality metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data quality metrics'
      });
    }
  }

  static async getDataQualityMetricsByDataSource(req: AuthenticatedRequest, res: Response) {
    try {
      const { dataSourceId } = req.params;
      
      const result = await pool.query(
        `SELECT dqm.*, ds.name as data_source_name 
         FROM data_quality_metrics dqm
         LEFT JOIN data_sources ds ON dqm.data_source_id = ds.id
         WHERE dqm.data_source_id = $1
         ORDER BY dqm.last_updated DESC`,
        [dataSourceId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching data quality metrics by data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data quality metrics'
      });
    }
  }

  static async getDataQualitySummary(req: AuthenticatedRequest, res: Response) {
    try {
      const { region, industry } = req.query;

      let whereClause = '';
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (region) {
        whereClause += ` WHERE region = $${paramIndex++}`;
        queryParams.push(region);
      }

      if (industry) {
        whereClause += whereClause ? ` AND industry = $${paramIndex++}` : ` WHERE industry = $${paramIndex++}`;
        queryParams.push(industry);
      }

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_records,
          AVG(completeness) as avg_completeness,
          AVG(accuracy) as avg_accuracy,
          AVG(consistency) as avg_consistency,
          AVG(timeliness) as avg_timeliness,
          AVG(validity) as avg_validity,
          AVG(score) as avg_score,
          MIN(score) as min_score,
          MAX(score) as max_score,
          COUNT(CASE WHEN score >= 90 THEN 1 END) as excellent_count,
          COUNT(CASE WHEN score >= 70 AND score < 90 THEN 1 END) as good_count,
          COUNT(CASE WHEN score >= 50 AND score < 70 THEN 1 END) as fair_count,
          COUNT(CASE WHEN score < 50 THEN 1 END) as poor_count
        FROM data_quality_metrics${whereClause}
      `;

      const result = await pool.query(summaryQuery, queryParams);

      const summary = {
        ...result.rows[0],
        distribution: {
          excellent: parseInt(result.rows[0].excellent_count),
          good: parseInt(result.rows[0].good_count),
          fair: parseInt(result.rows[0].fair_count),
          poor: parseInt(result.rows[0].poor_count)
        }
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching data quality summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data quality summary'
      });
    }
  }

  static async getDataQualityTrends(req: AuthenticatedRequest, res: Response) {
    try {
      const { dataSourceId, period = '7d' } = req.query;

      let interval = 'day';
      let limit = 7;

      if (period === '30d') {
        interval = 'day';
        limit = 30;
      } else if (period === '90d') {
        interval = 'week';
        limit = 12;
      }

      let whereClause = 'WHERE last_updated >= NOW() - INTERVAL';
      let queryParams: any[] = [];

      if (period === '7d') {
        whereClause += ' \'7 days\'';
      } else if (period === '30d') {
        whereClause += ' \'30 days\'';
      } else if (period === '90d') {
        whereClause += ' \'90 days\'';
      }

      if (dataSourceId) {
        whereClause += ` AND data_source_id = $1`;
        queryParams.push(dataSourceId);
      }

      const trendsQuery = `
        SELECT 
          DATE_TRUNC('${interval}', last_updated) as period,
          AVG(completeness) as avg_completeness,
          AVG(accuracy) as avg_accuracy,
          AVG(consistency) as avg_consistency,
          AVG(timeliness) as avg_timeliness,
          AVG(validity) as avg_validity,
          AVG(score) as avg_score,
          COUNT(*) as record_count
        FROM data_quality_metrics
        ${whereClause}
        GROUP BY DATE_TRUNC('${interval}', last_updated)
        ORDER BY period DESC
        LIMIT ${limit}
      `;

      const result = await pool.query(trendsQuery, queryParams);

      res.json({
        success: true,
        data: result.rows.reverse()
      });
    } catch (error) {
      console.error('Error fetching data quality trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data quality trends'
      });
    }
  }

  static async getRegionsAndIndustries(req: AuthenticatedRequest, res: Response) {
    try {
      const regionsQuery = `
        SELECT DISTINCT region 
        FROM data_quality_metrics 
        WHERE region IS NOT NULL 
        ORDER BY region
      `;
      const regionsResult = await pool.query(regionsQuery);

      const industriesQuery = `
        SELECT DISTINCT industry 
        FROM data_quality_metrics 
        WHERE industry IS NOT NULL 
        ORDER BY industry
      `;
      const industriesResult = await pool.query(industriesQuery);

      res.json({
        success: true,
        data: {
          regions: regionsResult.rows.map(row => row.region),
          industries: industriesResult.rows.map(row => row.industry)
        }
      });
    } catch (error) {
      console.error('Error fetching regions and industries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch regions and industries'
      });
    }
  }

  static async createOrUpdateDataQualityMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        dataSourceId, 
        region, 
        industry, 
        completeness, 
        accuracy, 
        consistency, 
        timeliness, 
        validity 
      } = req.body;

      const score = (completeness + accuracy + consistency + timeliness + validity) / 5;

      const result = await pool.query(
        `INSERT INTO data_quality_metrics 
         (data_source_id, region, industry, completeness, accuracy, consistency, timeliness, validity, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (data_source_id, region, industry) 
         DO UPDATE SET
           completeness = EXCLUDED.completeness,
           accuracy = EXCLUDED.accuracy,
           consistency = EXCLUDED.consistency,
           timeliness = EXCLUDED.timeliness,
           validity = EXCLUDED.validity,
           score = EXCLUDED.score,
           last_updated = CURRENT_TIMESTAMP
         RETURNING *`,
        [dataSourceId, region, industry, completeness, accuracy, consistency, timeliness, validity, score]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Data quality metrics created/updated successfully'
      });
    } catch (error) {
      console.error('Error creating/updating data quality metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create/update data quality metrics'
      });
    }
  }
}