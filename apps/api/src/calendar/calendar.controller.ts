import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  // ============================================================
  // CALENDAR CONNECTIONS
  // ============================================================

  @Post('connect/:provider')
  async connectCalendar(
    @CurrentUser() user: UserPayload,
    @Param('provider') provider: 'google' | 'outlook' | 'microsoft',
    @Body() data: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
      scope?: string;
      email: string;
    },
  ) {
    return this.calendar.connectCalendar(user.organizationId, user.userId, provider, {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
  }

  @Delete('disconnect/:provider')
  async disconnectCalendar(
    @CurrentUser() user: UserPayload,
    @Param('provider') provider: string,
  ) {
    await this.calendar.disconnectCalendar(user.organizationId, user.userId, provider);
    return { success: true };
  }

  @Get('connections')
  async getConnections(@CurrentUser() user: UserPayload) {
    return this.calendar.getCalendarConnections(user.organizationId, user.userId);
  }

  @Post('primary/:connectionId')
  async setPrimaryCalendar(
    @CurrentUser() user: UserPayload,
    @Param('connectionId') connectionId: string,
  ) {
    await this.calendar.setPrimaryCalendar(user.organizationId, user.userId, connectionId);
    return { success: true };
  }

  // ============================================================
  // BOOKING LINKS
  // ============================================================

  @Post('booking-links')
  async createBookingLink(
    @CurrentUser() user: UserPayload,
    @Body() data: {
      name: string;
      slug: string;
      duration: number;
      description?: string;
      availabilityWindows: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }>;
      bufferMinutes?: number;
      maxAdvanceDays?: number;
      minAdvanceHours?: number;
      timezone?: string;
    },
  ) {
    return this.calendar.createBookingLink(user.organizationId, user.userId, data);
  }

  @Put('booking-links/:id')
  async updateBookingLink(
    @CurrentUser() user: UserPayload,
    @Param('id') linkId: string,
    @Body() data: Partial<{
      name: string;
      duration: number;
      description: string;
      availabilityWindows: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
      bufferMinutes: number;
      maxAdvanceDays: number;
      minAdvanceHours: number;
      timezone: string;
      isActive: boolean;
    }>,
  ) {
    return this.calendar.updateBookingLink(user.organizationId, user.userId, linkId, data);
  }

  @Get('booking-links')
  async getBookingLinks(@CurrentUser() user: UserPayload) {
    return this.calendar.getBookingLinks(user.organizationId, user.userId);
  }

  @Get('booking-links/public/:slug')
  async getPublicBookingLink(
    @CurrentUser() user: UserPayload,
    @Param('slug') slug: string,
  ) {
    return this.calendar.getBookingLink(user.organizationId, slug);
  }

  // ============================================================
  // AVAILABILITY & BOOKINGS
  // ============================================================

  @Get('availability')
  async getAvailability(
    @CurrentUser() user: UserPayload,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
    @Query('duration') duration: string,
  ) {
    return this.calendar.getAvailability(
      user.organizationId,
      user.userId,
      new Date(startDate),
      new Date(endDate),
      parseInt(duration) || 30,
    );
  }

  @Post('bookings')
  async createBooking(
    @CurrentUser() user: UserPayload,
    @Body() data: {
      contactId: string;
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      contactEmail: string;
      contactName: string;
      provider: 'google' | 'outlook' | 'zoom' | 'teams';
      bookingLinkId?: string;
    },
  ) {
    return this.calendar.createBooking(user.organizationId, {
      ...data,
      userId: user.userId,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    });
  }

  @Get('bookings')
  async getBookings(
    @CurrentUser() user: UserPayload,
    @Query('contactId') contactId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.calendar.getBookings(user.organizationId, {
      userId: user.userId,
      contactId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Delete('bookings/:id')
  async cancelBooking(
    @CurrentUser() user: UserPayload,
    @Param('id') bookingId: string,
    @Body() data?: { reason?: string },
  ) {
    await this.calendar.cancelBooking(user.organizationId, bookingId, data?.reason);
    return { success: true };
  }

  @Get('bookings/stats')
  async getBookingStats(@CurrentUser() user: UserPayload) {
    return this.calendar.getBookingStats(user.organizationId, user.userId);
  }
}
