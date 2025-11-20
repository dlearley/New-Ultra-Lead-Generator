import { Request, Response } from 'express';
import { CrmService } from '../services/crmService';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const crmService = new CrmService();

export const pushLeads = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { crmType, leadIds, leads, runImmediately = false } = req.body;
  const organizationId = req.headers['x-organization-id'] as string;

  if (!organizationId) {
    res.status(400).json({
      error: {
        message: 'Organization ID is required',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const result = await crmService.pushLeadsToCrm(
      organizationId,
      crmType,
      leadIds || null,
      leads || null,
      runImmediately
    );

    res.status(202).json({
      success: true,
      message: result.message,
      data: {
        jobIds: result.jobIds,
        leadCount: leadIds?.length || leads?.length || 0,
        crmType,
        runImmediately,
      },
    });
  } catch (error: any) {
    logger.error('Push leads error', {
      organizationId,
      crmType,
      error: error.message,
    });

    res.status(400).json({
      error: {
        message: error.message || 'Failed to push leads',
        statusCode: 400,
      },
    });
  }
});

export const getSyncJobs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.headers['x-organization-id'] as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const crmType = req.query.crmType as string;

  if (!organizationId) {
    res.status(400).json({
      error: {
        message: 'Organization ID is required',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const result = await crmService.getSyncJobs(
      organizationId,
      page,
      limit,
      status,
      crmType
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Get sync jobs error', {
      organizationId,
      error: error.message,
    });

    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch sync jobs',
        statusCode: 500,
      },
    });
  }
});

export const getSyncJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.headers['x-organization-id'] as string;
  const { jobId } = req.params;

  if (!organizationId) {
    res.status(400).json({
      error: {
        message: 'Organization ID is required',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const job = await crmService.getSyncJobById(organizationId, jobId);

    res.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    logger.error('Get sync job error', {
      organizationId,
      jobId,
      error: error.message,
    });

    if (error.message === 'Sync job not found') {
      res.status(404).json({
        error: {
          message: 'Sync job not found',
          statusCode: 404,
        },
      });
    } else {
      res.status(500).json({
        error: {
          message: error.message || 'Failed to fetch sync job',
          statusCode: 500,
        },
      });
    }
  }
});

export const testCrmConnection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.headers['x-organization-id'] as string;
  const { crmType } = req.body;

  if (!organizationId) {
    res.status(400).json({
      error: {
        message: 'Organization ID is required',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const result = await crmService.testCrmConnection(organizationId, crmType);

    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('Test CRM connection error', {
      organizationId,
      crmType,
      error: error.message,
    });

    res.status(500).json({
      error: {
        message: error.message || 'Failed to test CRM connection',
        statusCode: 500,
      },
    });
  }
});