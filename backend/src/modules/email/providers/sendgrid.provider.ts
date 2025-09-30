import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import {
  EmailProvider,
  EmailData,
  EmailSendResult,
} from '../interfaces/email.interface';

@Injectable()
export class SendGridProvider implements EmailProvider {
  readonly name = 'sendgrid';
  private readonly logger = new Logger(SendGridProvider.name);

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      this.logger.warn('SendGrid API key not configured');
      return;
    }

    sgMail.setApiKey(apiKey);
  }

  async send(emailData: EmailData): Promise<EmailSendResult> {
    try {
      const msg = this.formatEmail(emailData);
      const response = await sgMail.send(msg);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'] as string,
        provider: this.name,
        sentAt: new Date(),
        metadata: {
          statusCode: response[0].statusCode,
          headers: response[0].headers,
        },
      };
    } catch (error) {
      this.logger.error('SendGrid send failed:', error);
      return {
        success: false,
        error: error.message,
        provider: this.name,
        sentAt: new Date(),
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // SendGrid doesn't have a dedicated health check endpoint
      // We can check if API key is configured
      return !!process.env.SENDGRID_API_KEY;
    } catch {
      return false;
    }
  }

  private formatEmail(emailData: EmailData): sgMail.MailDataRequired {
    return {
      to: emailData.to.map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
      })),
      cc: emailData.cc?.map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
      })),
      bcc: emailData.bcc?.map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
      })),
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        name: process.env.SENDGRID_FROM_NAME || 'No Reply',
      },
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments?.map((att) => ({
        filename: att.filename,
        content:
          typeof att.content === 'string'
            ? att.content
            : att.content.toString('base64'),
        type: att.contentType,
        disposition: 'attachment',
        contentId: att.cid,
      })),
      categories: emailData.tags,
      customArgs: emailData.metadata,
    };
  }
}
