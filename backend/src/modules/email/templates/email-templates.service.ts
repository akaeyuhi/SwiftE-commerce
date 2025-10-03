import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import {
  EmailTemplate,
  EmailSendResult,
} from 'src/common/interfaces/infrastructure/email.interface';
import { SMTPProvider } from '../providers/smtp.provider';
import * as fs from 'node:fs';
import { join } from 'path';
import { EmailJobType } from 'src/common/enums/email.enum';

interface TemplateConfig {
  templateFile: string;
  subject: string;
  previewText?: string;
  category?: string;
}

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);
  private readonly templates = new Map<EmailJobType, TemplateConfig>();

  constructor(private readonly mailerService: MailerService) {
    this.initializeTemplates();
  }

  /**
   * Initialize all email templates with their configurations
   */
  private initializeTemplates(): void {
    // Authentication & Account Management
    this.templates.set(EmailJobType.USER_CONFIRMATION, {
      templateFile: 'user-confirmation',
      subject: 'Confirm Your Email Address',
      previewText: 'Please confirm your email to activate your account',
      category: 'authentication',
    });

    this.templates.set(EmailJobType.WELCOME, {
      templateFile: 'welcome',
      subject: 'Welcome to {{storeName}}!',
      previewText: `Thanks for joining us. Let's get started!`,
      category: 'onboarding',
    });

    this.templates.set(EmailJobType.PASSWORD_RESET, {
      templateFile: 'password-reset',
      subject: 'Reset Your Password',
      previewText: 'Click here to reset your password',
      category: 'authentication',
    });

    this.templates.set(EmailJobType.ROLE_CONFIRMATION, {
      templateFile: 'role-confirmation',
      subject: 'New Role Assignment - Action Required',
      previewText: 'You have been assigned a new role. Please confirm.',
      category: 'authorization',
    });

    // Order Management
    this.templates.set(EmailJobType.ORDER_CONFIRMATION, {
      templateFile: 'order-confirmation',
      subject: 'Order Confirmation - Order #{{orderNumber}}',
      previewText: 'Thank you for your order!',
      category: 'orders',
    });

    this.templates.set(EmailJobType.ORDER_SHIPPED, {
      templateFile: 'order-shipped',
      subject: 'Your Order Has Shipped - Order #{{orderNumber}}',
      previewText: 'Track your package',
      category: 'orders',
    });

    this.templates.set(EmailJobType.ORDER_DELIVERED, {
      templateFile: 'order-delivered',
      subject: 'Order Delivered - Order #{{orderNumber}}',
      previewText: 'Your order has been delivered',
      category: 'orders',
    });

    // Inventory & Stock Management
    this.templates.set(EmailJobType.STOCK_ALERT, {
      templateFile: 'stock-alert',
      subject: '{{productName}} is Back in Stock!',
      previewText: 'The item you wanted is now available',
      category: 'inventory',
    });

    this.templates.set(EmailJobType.LOW_STOCK_WARNING, {
      templateFile: 'low-stock-warning',
      subject: 'Low Stock Alert - {{productName}}',
      previewText: 'Your product is running low on inventory',
      category: 'inventory',
    });

    // Marketing & Engagement
    this.templates.set(EmailJobType.NEWSLETTER, {
      templateFile: 'newsletter',
      subject: '{{newsletterTitle}}',
      previewText: 'Your latest updates from {{storeName}}',
      category: 'marketing',
    });

    this.templates.set(EmailJobType.MARKETING, {
      templateFile: 'marketing',
      subject: '{{campaignTitle}}',
      previewText: 'Special offers just for you',
      category: 'marketing',
    });

    // General Notifications
    this.templates.set(EmailJobType.NOTIFICATION, {
      templateFile: 'notification',
      subject: '{{notificationTitle}}',
      previewText: 'You have a new notification',
      category: 'notification',
    });

    this.templates.set(EmailJobType.NEWS_PUBLISHED, {
      templateFile: 'news-published',
      subject: 'New Post from {{storeName}}: {{newsTitle}}',
      previewText: '{{newsExcerpt}}',
      category: 'news',
    });

    this.logger.log(`Initialized ${this.templates.size} email templates`);
  }

  /**
   * Get template configuration by job type
   */
  getTemplate(type: EmailJobType): TemplateConfig | undefined {
    return this.templates.get(type);
  }

  /**
   * Get all templates by category
   */
  getTemplatesByCategory(category: string): Map<EmailJobType, TemplateConfig> {
    const filtered = new Map<EmailJobType, TemplateConfig>();

    this.templates.forEach((config, type) => {
      if (config.category === category) {
        filtered.set(type, config);
      }
    });

    return filtered;
  }

  /**
   * Render template subject with context data
   */
  renderSubject(subject: string, data: Record<string, any>): string {
    return this.processTemplate(subject, data);
  }

  /**
   * Render full template with context data
   */
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
    jobType: EmailJobType,
    context: Record<string, any>,
    emailOptions: {
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      attachments?: any[];
      replyTo?: string;
    }
  ): Promise<EmailSendResult> {
    const template = this.getTemplate(jobType);

    if (!template) {
      throw new Error(`Template not found for job type: ${jobType}`);
    }

    try {
      // Render subject with context
      const subject = this.renderSubject(template.subject, context);

      // Send email using MailerService with Handlebars template
      const result = await this.mailerService.sendMail({
        to: emailOptions.to,
        cc: emailOptions.cc,
        bcc: emailOptions.bcc,
        subject,
        template: template.templateFile, // This will look for template-name.hbs
        context, // Handlebars context data
        attachments: emailOptions.attachments,
        replyTo: emailOptions.replyTo,
      });

      this.logger.log(
        `Templated email sent: ${result.messageId} using template: ${template.templateFile}`
      );

      return {
        success: true,
        messageId: result.messageId,
        provider: 'smtp',
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send templated email using ${template.templateFile}:`,
        error
      );

      return {
        success: false,
        provider: 'smtp',
        sentAt: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Preview template with context data (for development/testing)
   */
  async previewTemplate(
    jobType: EmailJobType,
    context: Record<string, any>
  ): Promise<{
    subject: string;
    templateFile: string;
    context: Record<string, any>;
    category?: string;
  }> {
    const template = this.getTemplate(jobType);

    if (!template) {
      throw new Error(`Template not found for job type: ${jobType}`);
    }

    try {
      const subject = this.renderSubject(template.subject, context);

      return {
        subject,
        templateFile: template.templateFile,
        context,
        category: template.category,
      };
    } catch (error) {
      this.logger.error(
        `Failed to preview template ${template.templateFile}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Process template string with simple variable replacement
   * Supports: {{variable}} and {{#if condition}}content{{/if}}
   */
  private processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;

    // Replace simple variables: {{variable}}
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value ?? ''));
    });

    // Handle conditional blocks: {{#if condition}}content{{/if}}
    processed = processed.replace(
      /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
      (match, condition, content) => (data[condition] ? content : '')
    );

    // Handle negative conditional blocks: {{#unless condition}}content{{/unless}}
    processed = processed.replace(
      /{{#unless\s+(\w+)}}([\s\S]*?){{\/unless}}/g,
      (match, condition, content) => (!data[condition] ? content : '')
    );

    return processed;
  }

  /**
   * Validate that all template files exist (for startup checks)
   */
  async validateTemplates(): Promise<{
    valid: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];

    // In a real implementation, you would check if the .hbs files exist
    // For now, we'll just return valid
    this.templates.forEach((config) => {
      const templatePath = join(
        __dirname,
        'handlebars',
        `${config.templateFile}.hbs`
      );
      if (!fs.existsSync(templatePath)) {
        missing.push(config.templateFile);
      }
    });

    if (missing.length > 0) {
      this.logger.warn(`Missing template files: ${missing.join(', ')}`);
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get list of all available templates
   */
  getAvailableTemplates(): Array<{
    type: EmailJobType;
    templateFile: string;
    subject: string;
    category?: string;
  }> {
    const templates: Array<{
      type: EmailJobType;
      templateFile: string;
      subject: string;
      category?: string;
    }> = [];

    this.templates.forEach((config, type) => {
      templates.push({
        type,
        templateFile: config.templateFile,
        subject: config.subject,
        category: config.category,
      });
    });

    return templates;
  }
}
