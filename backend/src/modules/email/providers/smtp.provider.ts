import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SentMessageInfo } from 'nodemailer';
import { ISendMailOptions } from '@nestjs-modules/mailer';
import {
  EmailProvider,
  EmailData,
  EmailSendResult,
} from 'src/common/interfaces/infrastructure/email.interface';

@Injectable()
export class SMTPProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly logger = new Logger(SMTPProvider.name);

  constructor(private readonly mailerService: MailerService) {}

  async send(emailData: EmailData): Promise<EmailSendResult> {
    try {
      const mailOptions = this.formatEmail(emailData);
      const result: SentMessageInfo =
        await this.mailerService.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        provider: this.name,
        sentAt: new Date(),
        metadata: {
          response: result.response,
          envelope: result.envelope,
          accepted: result.accepted,
          rejected: result.rejected,
          pending: result.pending,
        },
      };
    } catch (error) {
      this.logger.error('SMTP send failed:', error);
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
      // Simple configuration check since we can't access private transporter
      const isConfigured = !!(
        process.env.SMTP_HOST &&
        process.env.SMTP_USERNAME &&
        process.env.SMTP_PASSWORD
      );

      if (!isConfigured) {
        this.logger.warn('SMTP configuration incomplete');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn('SMTP health check failed:', error.message);
      return false;
    }
  }

  private formatEmail(emailData: EmailData): ISendMailOptions {
    // Build headers object with proper types
    const headers: Record<string, string> = {};

    if (emailData.tags && emailData.tags.length > 0) {
      headers['X-Tags'] = emailData.tags.join(',');
    }

    if (emailData.metadata && Object.keys(emailData.metadata).length > 0) {
      headers['X-Metadata'] = JSON.stringify(emailData.metadata);
    }

    if (emailData.priority) {
      headers['X-Priority'] = this.getPriorityHeader(emailData.priority);
    }

    const mailOptions: ISendMailOptions = {
      to: this.formatRecipients(emailData.to),
      subject: emailData.subject,
      html: emailData.html,
    };

    // Add optional fields only if they exist
    if (emailData.cc && emailData.cc.length > 0) {
      mailOptions.cc = this.formatRecipients(emailData.cc);
    }

    if (emailData.bcc && emailData.bcc.length > 0) {
      mailOptions.bcc = this.formatRecipients(emailData.bcc);
    }

    if (emailData.text) {
      mailOptions.text = emailData.text;
    }

    if (emailData.attachments && emailData.attachments.length > 0) {
      mailOptions.attachments = emailData.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        cid: att.cid,
      }));
    }

    // Add headers only if there are any
    if (Object.keys(headers).length > 0) {
      mailOptions.headers = headers;
    }

    // Set custom from address if provided
    if (emailData.from) {
      mailOptions.from = {
        name: emailData.from.name || process.env.SMTP_FROM_NAME || 'No Reply',
        address:
          emailData.from.email ||
          process.env.SMTP_FROM_EMAIL ||
          'noreply@example.com',
      };
    }

    return mailOptions;
  }

  private formatRecipients(
    recipients: { email: string; name?: string }[]
  ): string[] {
    return recipients.map((recipient) => {
      if (recipient.name) {
        return `${recipient.name} <${recipient.email}>`;
      }
      return recipient.email;
    });
  }

  private getPriorityHeader(priority?: number): string {
    switch (priority) {
      case 4: // URGENT
        return '1 (Highest)';
      case 3: // HIGH
        return '2 (High)';
      case 1: // LOW
        return '4 (Low)';
      default: // NORMAL
        return '3 (Normal)';
    }
  }

  /**
   * Send templated email using @nestjs-modules/mailer template system
   */
  async sendTemplate(
    template: string,
    context: Record<string, any>,
    emailData: Omit<EmailData, 'html' | 'text'>
  ): Promise<EmailSendResult> {
    try {
      const mailOptions: ISendMailOptions = {
        to: this.formatRecipients(emailData.to),
        subject: emailData.subject,
        template, // Template file name without extension
        context, // Variables to pass to template
      };

      // Add optional fields
      if (emailData.cc && emailData.cc.length > 0) {
        mailOptions.cc = this.formatRecipients(emailData.cc);
      }

      if (emailData.bcc && emailData.bcc.length > 0) {
        mailOptions.bcc = this.formatRecipients(emailData.bcc);
      }

      if (emailData.attachments && emailData.attachments.length > 0) {
        mailOptions.attachments = emailData.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          cid: att.cid,
        }));
      }

      // Set custom from address if provided
      if (emailData.from) {
        mailOptions.from = {
          name: emailData.from.name || process.env.SMTP_FROM_NAME || 'No Reply',
          address:
            emailData.from.email ||
            process.env.SMTP_FROM_EMAIL ||
            'noreply@example.com',
        };
      }

      const result: SentMessageInfo =
        await this.mailerService.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        provider: this.name,
        sentAt: new Date(),
        metadata: {
          template,
          context: Object.keys(context),
          response: result.response,
          envelope: result.envelope,
        },
      };
    } catch (error) {
      this.logger.error('SMTP template send failed:', error);
      return {
        success: false,
        error: error.message,
        provider: this.name,
        sentAt: new Date(),
      };
    }
  }

  /**
   * Get mailer service configuration info
   */
  getProviderInfo(): {
    name: string;
    transportOptions: {
      host: string;
      port: string;
      secure: boolean;
      auth: {
        hasUser: boolean;
        hasPass: boolean;
      };
    };
    defaultFrom: { name?: string; address?: string };
    templatesEnabled: boolean;
  } {
    return {
      name: this.name,
      transportOptions: {
        host: process.env.SMTP_HOST || 'unknown',
        port: process.env.SMTP_PORT || 'unknown',
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          hasUser: !!process.env.SMTP_USERNAME,
          hasPass: !!process.env.SMTP_PASSWORD,
        },
      },
      defaultFrom: {
        name: process.env.SMTP_FROM_NAME,
        address: process.env.SMTP_FROM_EMAIL,
      },
      templatesEnabled: true,
    };
  }

  /**
   * Test email sending capability
   */
  async sendTestEmail(to: string): Promise<EmailSendResult> {
    const testEmailData: EmailData = {
      to: [{ email: to }],
      subject: 'SMTP Provider Test Email',
      html: `
        <h1>SMTP Test Email</h1>
        <p>This is a test email sent at ${new Date().toISOString()}</p>
        <p>If you receive this email, your SMTP configuration is working correctly.</p>
      `,
      text: `SMTP Test Email\n\nThis is a test email sent at ${new Date().toISOString()}\n\nIf you receive this email, your SMTP configuration is working correctly.`,
      tags: ['test', 'smtp'],
      metadata: {
        testType: 'smtp-health-check',
        timestamp: new Date().toISOString(),
      },
    };

    return this.send(testEmailData);
  }

  /**
   * Enhanced health check that attempts to send a test email
   */
  async healthCheckWithTest(testEmail?: string): Promise<{
    healthy: boolean;
    configValid: boolean;
    testEmailSent?: boolean;
    error?: string;
  }> {
    // First check configuration
    const configValid = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USERNAME &&
      process.env.SMTP_PASSWORD
    );

    if (!configValid) {
      return {
        healthy: false,
        configValid: false,
        error: 'SMTP configuration incomplete',
      };
    }

    // If test email is provided, try to send it
    if (testEmail) {
      try {
        const result = await this.sendTestEmail(testEmail);
        return {
          healthy: result.success,
          configValid: true,
          testEmailSent: result.success,
          error: result.success ? undefined : result.error,
        };
      } catch (error) {
        return {
          healthy: false,
          configValid: true,
          testEmailSent: false,
          error: error.message,
        };
      }
    }

    return {
      healthy: true,
      configValid: true,
    };
  }
}
