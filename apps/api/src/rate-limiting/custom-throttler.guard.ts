import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use API key if present, otherwise use IP
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return `api:${apiKey}`;
    }
    
    // Use authenticated user ID if available
    const userId = req.user?.userId;
    if (userId) {
      return `user:${userId}`;
    }
    
    // Fall back to IP address
    return `ip:${req.ip || req.connection?.remoteAddress || 'unknown'}`;
  }

  protected async throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: any): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const tracker = request.headers['x-api-key'] || request.user?.userId || request.ip;
    
    this.logger.warn(`Rate limit exceeded for ${tracker}`);
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
