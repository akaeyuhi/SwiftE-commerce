// src/modules/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  EmailProvider,
  EmailData,
  EmailSendResult,
  EmailJobType,
} from './interfaces/email.interface';
import { EmailTemplatesService } from './templates/email-templates.service';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SMTPProvider } from './providers/smtp.provider';

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
    // Configure providers based on environment
    this.providers = [this.sendGridProvider, this.smtpProvider];
    this.primaryProvider = this.selectPrimaryProvider();
  }

  async sendEmail(
    emailData: EmailData,
    jobType?: EmailJobType
  ): Promise<EmailSendResult> {
    try {
      // Process template if templateId is provided
      if (emailData.templateId && jobType) {
        const processedEmail = await this.processTemplate(emailData, jobType);
        emailData = { ...emailData, ...processedEmail };
      }

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

  private async processTemplate(emailData: EmailData, jobType: EmailJobType) {
    const template = this.templatesService.getTemplate(jobType);
    if (!template) {
      throw new Error(`Template not found for job type: ${jobType}`);
    }

    const processed = this.templatesService.renderTemplate(
      template,
      emailData.templateData || {}
    );

    return {
      subject: processed.subject,
      html: processed.html,
      text: processed.text,
    };
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

    if (!emailData.html && !emailData.text) {
      throw new Error('Email content (html or text) is required');
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
        // Default to SendGrid if API key is available, otherwise SMTP
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
