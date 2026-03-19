import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export interface CalendarProvider {
  name: string;
  authUrl: string;
  connect(): Promise<{ connected: boolean; email?: string }>;
  disconnect(): Promise<void>;
  getAvailability(startDate: Date, endDate: Date): Promise<Array<{ start: Date; end: Date }>>;
  createEvent(data: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    location?: string;
  }): Promise<{ eventId: string; meetingLink?: string }>;
  deleteEvent(eventId: string): Promise<void>;
}

export interface MeetingBooking {
  id: string;
  contactId: string;
  contactEmail: string;
  contactName: string;
  userId: string;
  userEmail: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  provider: 'google' | 'outlook' | 'zoom' | 'teams';
  meetingLink?: string;
  calendarEventId?: string;
  sequenceStepId?: string;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CALENDAR CONNECTION MANAGEMENT
  // ============================================================

  async connectCalendar(
    organizationId: string,
    userId: string,
    provider: 'google' | 'outlook' | 'microsoft',
    data: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
      scope?: string;
      email: string;
    },
  ) {
    // Check if already connected
    const existing = await this.prisma.calendarConnection.findUnique({
      where: {
        organizationId_userId_provider: {
          organizationId,
          userId,
          provider,
        },
      },
    });

    if (existing) {
      // Update existing connection
      return this.prisma.calendarConnection.update({
        where: { id: existing.id },
        data: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          scope: data.scope,
          email: data.email,
          status: 'active',
          lastRefreshedAt: new Date(),
        },
      });
    }

    // Create new connection
    return this.prisma.calendarConnection.create({
      data: {
        organizationId,
        userId,
        provider,
        email: data.email,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        scope: data.scope,
        status: 'active',
      },
    });
  }

  async disconnectCalendar(
    organizationId: string,
    userId: string,
    provider: string,
  ): Promise<void> {
    await this.prisma.calendarConnection.updateMany({
      where: {
        organizationId,
        userId,
        provider,
      },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date(),
      },
    });
  }

  async getCalendarConnections(organizationId: string, userId: string) {
    return this.prisma.calendarConnection.findMany({
      where: {
        organizationId,
        userId,
        status: 'active',
      },
      select: {
        id: true,
        provider: true,
        email: true,
        status: true,
        createdAt: true,
        lastRefreshedAt: true,
      },
    });
  }

  async getPrimaryCalendar(organizationId: string, userId: string) {
    return this.prisma.calendarConnection.findFirst({
      where: {
        organizationId,
        userId,
        status: 'active',
        isPrimary: true,
      },
    });
  }

  async setPrimaryCalendar(
    organizationId: string,
    userId: string,
    connectionId: string,
  ): Promise<void> {
    // Unset any existing primary
    await this.prisma.calendarConnection.updateMany({
      where: {
        organizationId,
        userId,
        isPrimary: true,
      },
      data: { isPrimary: false },
    });

    // Set new primary
    await this.prisma.calendarConnection.update({
      where: { id: connectionId },
      data: { isPrimary: true },
    });
  }

  // ============================================================
  // BOOKING LINKS
  // ============================================================

  async createBookingLink(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      slug: string;
      duration: number; // minutes
      description?: string;
      availabilityWindows: Array<{
        dayOfWeek: number; // 0-6 (Sunday-Saturday)
        startTime: string; // HH:mm
        endTime: string; // HH:mm
      }>;
      bufferMinutes?: number;
      maxAdvanceDays?: number;
      minAdvanceHours?: number;
      timezone?: string;
    },
  ) {
    // Check if slug is unique
    const existing = await this.prisma.bookingLink.findFirst({
      where: {
        organizationId,
        slug: data.slug,
      },
    });

    if (existing) {
      throw new Error('Booking link slug already exists');
    }

    return this.prisma.bookingLink.create({
      data: {
        organizationId,
        userId,
        name: data.name,
        slug: data.slug,
        duration: data.duration,
        description: data.description,
        availabilityWindows: data.availabilityWindows as any,
        bufferMinutes: data.bufferMinutes || 15,
        maxAdvanceDays: data.maxAdvanceDays || 30,
        minAdvanceHours: data.minAdvanceHours || 1,
        timezone: data.timezone || 'America/New_York',
        isActive: true,
      },
    });
  }

  async updateBookingLink(
    organizationId: string,
    userId: string,
    linkId: string,
    data: Partial<{
      name: string;
      duration: number;
      description: string;
      availabilityWindows: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }>;
      bufferMinutes: number;
      maxAdvanceDays: number;
      minAdvanceHours: number;
      timezone: string;
      isActive: boolean;
    }>,
  ) {
    const link = await this.prisma.bookingLink.findFirst({
      where: { id: linkId, organizationId, userId },
    });

    if (!link) {
      throw new Error('Booking link not found');
    }

    return this.prisma.bookingLink.update({
      where: { id: linkId },
      data: {
        ...data,
        availabilityWindows: data.availabilityWindows as any,
      },
    });
  }

  async getBookingLink(organizationId: string, slug: string) {
    return this.prisma.bookingLink.findFirst({
      where: {
        organizationId,
        slug,
        isActive: true,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getBookingLinks(organizationId: string, userId: string) {
    return this.prisma.bookingLink.findMany({
      where: {
        organizationId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // AVAILABILITY CHECKING
  // ============================================================

  async getAvailability(
    organizationId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
  ): Promise<Array<{ start: Date; end: Date }>> {
    // Get user's calendar connection
    const connection = await this.getPrimaryCalendar(organizationId, userId);

    if (!connection) {
      throw new Error('No calendar connected');
    }

    // In a real implementation, this would fetch from Google Calendar API
    // For now, return mock availability
    const slots: Array<{ start: Date; end: Date }> = [];
    const current = new Date(startDate);

    while (current < endDate) {
      // Add slots every 30 minutes during business hours (9 AM - 5 PM)
      const hour = current.getHours();
      if (hour >= 9 && hour < 17 && current.getDay() !== 0 && current.getDay() !== 6) {
        slots.push({
          start: new Date(current),
          end: new Date(current.getTime() + durationMinutes * 60000),
        });
      }
      current.setMinutes(current.getMinutes() + 30);
    }

    return slots;
  }

  // ============================================================
  // BOOKING MANAGEMENT
  // ============================================================

  async createBooking(
    organizationId: string,
    data: {
      bookingLinkId?: string;
      contactId: string;
      userId: string;
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      contactEmail: string;
      contactName: string;
      provider: 'google' | 'outlook' | 'zoom' | 'teams';
      sequenceStepId?: string;
    },
  ): Promise<MeetingBooking> {
    const duration = Math.round(
      (data.endTime.getTime() - data.startTime.getTime()) / 60000,
    );

    // Create calendar event (mock implementation)
    const calendarEventId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate meeting link if using Zoom/Teams
    let meetingLink: string | undefined;
    if (data.provider === 'zoom') {
      meetingLink = `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`;
    } else if (data.provider === 'teams') {
      meetingLink = `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${Math.random().toString(36).substr(2, 16)}`;
    }

    // Save booking
    const booking = await this.prisma.meetingBooking.create({
      data: {
        organizationId,
        bookingLinkId: data.bookingLinkId,
        contactId: data.contactId,
        userId: data.userId,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        duration,
        contactEmail: data.contactEmail,
        contactName: data.contactName,
        status: 'confirmed',
        provider: data.provider,
        meetingLink,
        calendarEventId,
        sequenceStepId: data.sequenceStepId,
      },
    });

    // Create activity
    await this.prisma.contactActivity.create({
      data: {
        organizationId,
        contactId: data.contactId,
        type: 'meeting_scheduled',
        metadata: {
          bookingId: booking.id,
          title: data.title,
          startTime: data.startTime,
          provider: data.provider,
        },
      },
    });

    return booking as MeetingBooking;
  }

  async cancelBooking(
    organizationId: string,
    bookingId: string,
    reason?: string,
  ): Promise<void> {
    const booking = await this.prisma.meetingBooking.findFirst({
      where: { id: bookingId, organizationId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Update booking status
    await this.prisma.meetingBooking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    // Delete calendar event (mock)
    this.logger.log(`Calendar event ${booking.calendarEventId} would be deleted`);
  }

  async getBookings(
    organizationId: string,
    filters?: {
      userId?: string;
      contactId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.prisma.meetingBooking.findMany({
      where: {
        organizationId,
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.contactId && { contactId: filters.contactId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.startDate && filters?.endDate && {
          startTime: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
      },
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            company: {
              select: { name: true },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async getBookingStats(organizationId: string, userId?: string) {
    const where: any = { organizationId };
    if (userId) where.userId = userId;

    const [
      total,
      confirmed,
      cancelled,
      completed,
      upcoming,
    ] = await Promise.all([
      this.prisma.meetingBooking.count({ where }),
      this.prisma.meetingBooking.count({ where: { ...where, status: 'confirmed' } }),
      this.prisma.meetingBooking.count({ where: { ...where, status: 'cancelled' } }),
      this.prisma.meetingBooking.count({ where: { ...where, status: 'completed' } }),
      this.prisma.meetingBooking.count({
        where: {
          ...where,
          status: 'confirmed',
          startTime: { gte: new Date() },
        },
      }),
    ]);

    // Get bookings by provider
    const byProvider = await this.prisma.meetingBooking.groupBy({
      by: ['provider'],
      where,
      _count: { provider: true },
    });

    return {
      total,
      confirmed,
      cancelled,
      completed,
      upcoming,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
      byProvider: byProvider.map((p) => ({
        provider: p.provider,
        count: p._count.provider,
      })),
    };
  }

  // ============================================================
  // SEQUENCE INTEGRATION
  // ============================================================

  async bookMeetingFromSequence(
    organizationId: string,
    sequenceStepId: string,
    contactId: string,
    userId: string,
    preferredTimes: Array<{ start: Date; end: Date }>,
  ): Promise<MeetingBooking | null> {
    // Get sequence step details
    const step = await this.prisma.sequenceStep.findUnique({
      where: { id: sequenceStepId },
    });

    if (!step || step.actionType !== 'meeting') {
      return null;
    }

    const config = step.actionConfig as any;

    // Get contact details
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Find first available slot
    const availability = await this.getAvailability(
      organizationId,
      userId,
      preferredTimes[0].start,
      preferredTimes[preferredTimes.length - 1].end,
      config.duration || 30,
    );

    if (availability.length === 0) {
      return null;
    }

    // Create booking with first available slot
    return this.createBooking(organizationId, {
      contactId,
      userId,
      title: config.meetingTitle || `Meeting with ${contact.firstName || contact.email}`,
      description: config.meetingDescription,
      startTime: availability[0].start,
      endTime: availability[0].end,
      contactEmail: contact.email,
      contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
      provider: config.provider || 'zoom',
      sequenceStepId,
    });
  }
}
