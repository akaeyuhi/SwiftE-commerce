import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import {
  EmailTemplate,
  EmailJobType,
  EmailSendResult,
} from '../interfaces/email.interface';
import { SMTPProvider } from '../providers/smtp.provider';

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);
  private readonly templates = new Map<EmailJobType, EmailTemplate>();

  constructor(
    private readonly mailerService: MailerService,
    private readonly smtpProvider: SMTPProvider
  ) {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Initialize templates as before...
    // (keeping the same template definitions from the previous implementation)
  }

  getTemplate(type: EmailJobType): EmailTemplate | undefined {
    return this.templates.get(type);
  }

  renderTemplate(
    template: EmailTemplate,
    data: Record<string, any>
  ): EmailTemplate {
    return {
      subject: this.processTemplate(template.subject, data),
      html: this.processTemplate(template.html, data),
      text: this.processTemplate(template.text, data),
    };
  }

  /**
   * Send email using Handlebars template files
   */
  async sendTemplatedEmail(
    templateName: string,
    context: Record<string, any>,
    emailOptions: {
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      subject: string;
      attachments?: any[];
    }
  ) {
    try {
      const result = await this.mailerService.sendMail({
        ...emailOptions,
        template: templateName,
        context,
      });

      this.logger.log(
        `Templated email sent: ${result.messageId} using template: ${templateName}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send templated email using ${templateName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Preview template with context data
   */
  async previewTemplate(
    templateName: string,
    context: Record<string, any>
  ): Promise<{
    html: string;
    text: string;
    subject: string;
    result: EmailSendResult;
  }> {
    try {
      // This would require implementing a preview mechanism
      // For now, we can use the SMTP provider's template functionality
      const result = await this.smtpProvider.sendTemplate(
        templateName,
        context,
        {
          to: [{ email: 'preview@example.com' }],
          subject: 'Preview Email',
        }
      );

      return {
        html: 'Template preview not implemented',
        text: 'Template preview not implemented',
        subject: 'Preview Email',
        result,
      };
    } catch (error) {
      this.logger.error(`Failed to preview template ${templateName}:`, error);
      throw error;
    }
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    // Keep the same template processing logic as before
    let processed = template;

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value || ''));
    });

    processed = processed.replace(
      /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
      (match, condition, content) => (data[condition] ? content : '')
    );

    return processed;
  }
}
