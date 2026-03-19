import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export interface SlackMessage {
  text: string;
  blocks?: any[];
  attachments?: any[];
  channel?: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // SLACK CONNECTION
  // ============================================================

  async connectSlack(
    organizationId: string,
    data: {
      teamId: string;
      teamName: string;
      accessToken: string;
      botToken?: string;
      webhookUrl?: string;
      channel?: string;
      channelId?: string;
      installedBy: string;
    },
  ) {
    return this.prisma.slackConnection.upsert({
      where: { organizationId },
      create: {
        organizationId,
        ...data,
        status: 'active',
      },
      update: {
        ...data,
        status: 'active',
        updatedAt: new Date(),
      },
    });
  }

  async disconnectSlack(organizationId: string): Promise<void> {
    await this.prisma.slackConnection.updateMany({
      where: { organizationId },
      data: { status: 'disconnected', disconnectedAt: new Date() },
    });
  }

  async getSlackConnection(organizationId: string) {
    return this.prisma.slackConnection.findUnique({
      where: { organizationId },
    });
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  async sendLeadAlert(
    organizationId: string,
    data: {
      contactId: string;
      contactName: string;
      contactEmail: string;
      company?: string;
      leadScore?: number;
      source: string;
      url: string;
    },
  ): Promise<void> {
    const connection = await this.getSlackConnection(organizationId);
    if (!connection || connection.status !== 'active' || !connection.webhookUrl) {
      return;
    }

    const message: SlackMessage = {
      text: `🎯 New Lead: ${data.contactName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎯 New Lead Alert',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Name:*\n${data.contactName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${data.contactEmail}`,
            },
            {
              type: 'mrkdwn',
              text: `*Company:*\n${data.company || 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Lead Score:*\n${data.leadScore || 'N/A'}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Source: ${data.source}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View in CRM',
                emoji: true,
              },
              url: data.url,
              style: 'primary',
            },
          ],
        },
      ],
    };

    await this.sendMessage(connection.webhookUrl, message);
  }

  async sendDealAlert(
    organizationId: string,
    data: {
      dealId: string;
      dealName: string;
      companyName: string;
      value: number;
      stage: string;
      ownerName: string;
      url: string;
    },
  ): Promise<void> {
    const connection = await this.getSlackConnection(organizationId);
    if (!connection || connection.status !== 'active' || !connection.webhookUrl) {
      return;
    }

    const message: SlackMessage = {
      text: `💰 Deal Update: ${data.dealName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '💰 Deal Alert',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Deal:*\n${data.dealName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Company:*\n${data.companyName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Value:*\n$${data.value.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Stage:*\n${data.stage}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Owner: ${data.ownerName}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Deal',
                emoji: true,
              },
              url: data.url,
              style: 'primary',
            },
          ],
        },
      ],
    };

    await this.sendMessage(connection.webhookUrl, message);
  }

  async sendMeetingAlert(
    organizationId: string,
    data: {
      contactName: string;
      meetingTime: Date;
      meetingTitle: string;
      ownerName: string;
      url: string;
    },
  ): Promise<void> {
    const connection = await this.getSlackConnection(organizationId);
    if (!connection || connection.status !== 'active' || !connection.webhookUrl) {
      return;
    }

    const message: SlackMessage = {
      text: `📅 Meeting Booked: ${data.contactName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📅 New Meeting Booked',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Contact:*\n${data.contactName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${data.meetingTime.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Title:*\n${data.meetingTitle}`,
            },
            {
              type: 'mrkdwn',
              text: `*Owner:*\n${data.ownerName}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Meeting',
                emoji: true,
              },
              url: data.url,
              style: 'primary',
            },
          ],
        },
      ],
    };

    await this.sendMessage(connection.webhookUrl, message);
  }

  private async sendMessage(webhookUrl: string, message: SlackMessage): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send Slack message: ${error.message}`);
    }
  }
}
