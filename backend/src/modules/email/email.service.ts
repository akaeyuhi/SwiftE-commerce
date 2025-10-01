import { Injectable, Logger } from '@nestjs/common';
import {
  EmailData,
  EmailProvider,
  EmailSendResult,
} from 'src/common/interfaces/infrastructure/email.interface';
import { EmailTemplatesService } from './templates/email-templates.service';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SMTPProvider } from './providers/smtp.provider';
import {EmailJobType} from "src/common/enums/email.enum";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly providers: EmailProvider[];
  private readonly primaryProvider: EmailProvider;

  constructor(
    private readonly templatesService: EmailTemplatesService,
    private readonly sendGridProvider: SendGridProvider,
    private readonly smtpProvider: SMTPProvider
  ) {
    this.providers = [this.sendGridProvider, this.smtpProvider];
    this.primaryProvider = this.selectPrimaryProvider();
  }

  /**
   * Send email with optional template processing
   */
  async sendEmail(
    emailData: EmailData,
    jobType?: EmailJobType
  ): Promise<EmailSendResult> {
    try {
      // If templateId and jobType provided, use Handlebars template system
      if (emailData.templateId && jobType) {
        return await this.sendTemplatedEmail(emailData, jobType);
      }

      // Otherwise, send directly with provided HTML/text
      return await this.sendDirectEmail(emailData);
    } catch (error) {
      this.logger.error('Email service error:', error);
      return {
        success: false,
        error: error.message,
        provider: 'unknown',
        sentAt: new Date(),
      };
    }
  }

  /**
   * Send email using Handlebars templates
   */
  private async sendTemplatedEmail(
    emailData: EmailData,
    jobType: EmailJobType
  ): Promise<EmailSendResult> {
    try {
      // Get template configuration
      const template = this.templatesService.getTemplate(jobType);
      if (!template) {
        throw new Error(`Template not found for job type: ${jobType}`);
      }

      // Use EmailTemplatesService to send with Handlebars
      return await this.templatesService.sendTemplatedEmail(
        jobType,
        emailData.templateData || {},
        {
          to: emailData.to.map((r) => r.email),
          cc: emailData.cc?.map((r) => r.email),
          bcc: emailData.bcc?.map((r) => r.email),
          attachments: emailData.attachments,
        }
      );
    } catch (error) {
      this.logger.error('Templated email error:', error);
      return {
        success: false,
        error: error.message,
        provider: 'smtp',
        sentAt: new Date(),
      };
    }
  }

  /**
   * Send email directly (without template processing)
   */
  private async sendDirectEmail(
    emailData: EmailData
  ): Promise<EmailSendResult> {
    // Validate email data
    this.validateEmailData(emailData);

    // Send using primary provider
    let result = await this.primaryProvider.send(emailData);

    // Fallback to other providers if primary fails
    if (!result.success && this.providers.length > 1) {
      this.logger.warn(
        `Primary provider ${this.primaryProvider.name} failed, trying fallback`
      );

      for (const provider of this.providers) {
        if (provider === this.primaryProvider) continue;

        result = await provider.send(emailData);
        if (result.success) {
          this.logger.log(
            `Email sent successfully using fallback provider: ${provider.name}`
          );
          break;
        }
      }
    }

    if (result.success) {
      this.logger.log(
        `Email sent successfully: ${result.messageId} via ${result.provider}`
      );
    } else {
      this.logger.error(`All email providers failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Send email with manual template data (for legacy/backward compatibility)
   */
  async sendWithManualTemplate(
    emailData: EmailData,
    templateHtml: string,
    templateText: string
  ): Promise<EmailSendResult> {
    const processedData: EmailData = {
      ...emailData,
      html: this.templatesService['processTemplate'](
        templateHtml,
        emailData.templateData || {}
      ),
      text: this.templatesService['processTemplate'](
        templateText,
        emailData.templateData || {}
      ),
    };

    return this.sendDirectEmail(processedData);
  }

  private validateEmailData(emailData: EmailData): void {
    if (!emailData.to || emailData.to.length === 0) {
      throw new Error('At least one recipient is required');
    }

    for (const recipient of emailData.to) {
      if (!this.isValidEmail(recipient.email)) {
        throw new Error(`Invalid email address: ${recipient.email}`);
      }
    }

    if (!emailData.subject || emailData.subject.trim().length === 0) {
      throw new Error('Email subject is required');
    }

    if (!emailData.html && !emailData.text && !emailData.templateId) {
      throw new Error('Email content (html, text, or templateId) is required');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private selectPrimaryProvider(): EmailProvider {
    const preferredProvider = process.env.EMAIL_PROVIDER?.toLowerCase();

    switch (preferredProvider) {
      case 'sendgrid':
        return this.sendGridProvider;
      case 'smtp':
        return this.smtpProvider;
      default:
        return process.env.SENDGRID_API_KEY
          ? this.sendGridProvider
          : this.smtpProvider;
    }
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    providers: Array<{ name: string; healthy: boolean }>;
  }> {
    const providerHealth = await Promise.all(
      this.providers.map(async (provider) => ({
        name: provider.name,
        healthy: await provider.healthCheck(),
      }))
    );

    const healthy = providerHealth.some((p) => p.healthy);

    return { healthy, providers: providerHealth };
  }
}
