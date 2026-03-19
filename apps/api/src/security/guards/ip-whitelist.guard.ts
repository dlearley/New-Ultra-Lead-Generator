import { Injectable, Logger, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.user?.organizationId;

    if (!organizationId) {
      return true; // No org context, skip check
    }

    // Get client IP
    const clientIp = this.getClientIp(request);

    // Check if IP whitelisting is enabled
    const settings = await this.prisma.securitySettings.findUnique({
      where: { organizationId },
    });

    if (!settings?.ipWhitelistEnabled) {
      return true; // Whitelisting not enabled
    }

    // Get whitelisted IPs
    const whitelistedIps = await this.prisma.ipWhitelist.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    if (whitelistedIps.length === 0) {
      return true; // No IPs whitelisted yet
    }

    // Check if IP matches any whitelist entry
    const isAllowed = whitelistedIps.some((entry) =>
      this.matchesIpPattern(clientIp, entry.ipPattern),
    );

    if (!isAllowed) {
      this.logger.warn(`IP ${clientIp} blocked for org ${organizationId}`);
      
      // Log the blocked attempt
      await this.prisma.securityEvent.create({
        data: {
          organizationId,
          eventType: 'ip_blocked',
          severity: 'high',
          description: `Access denied from unauthorized IP: ${clientIp}`,
          userId: request.user?.userId,
          ipAddress: clientIp,
          metadata: { userAgent: request.headers['user-agent'] },
          status: 'resolved',
        },
      });

      throw new UnauthorizedException('Access denied from this IP address');
    }

    return true;
  }

  private getClientIp(request: any): string {
    // Check for forwarded IP (behind proxy)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    // Check other headers
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Fall back to connection remote address
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  private matchesIpPattern(ip: string, pattern: string): boolean {
    // Support CIDR notation (e.g., 192.168.1.0/24)
    if (pattern.includes('/')) {
      return this.isIpInCidr(ip, pattern);
    }

    // Support wildcards (e.g., 192.168.1.*)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '\\d+') + '$');
      return regex.test(ip);
    }

    // Exact match
    return ip === pattern;
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);
    
    const ipLong = this.ipToLong(ip);
    const rangeLong = this.ipToLong(range);
    const maskLong = -1 << (32 - mask);

    return (ipLong & maskLong) === (rangeLong & maskLong);
  }

  private ipToLong(ip: string): number {
    return ip.split('.').reduce((acc, octet) => {
      return (acc << 8) + parseInt(octet, 10);
    }, 0) >>> 0;
  }
}
