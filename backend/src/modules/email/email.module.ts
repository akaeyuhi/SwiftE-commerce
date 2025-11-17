import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import * as fs from 'fs';

import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailTemplatesService } from './templates/email-templates.service';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SMTPProvider } from './providers/smtp.provider';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        const possiblePaths = [
          join(__dirname, 'templates', 'handlebars'),
          join(
            process.cwd(),
            'src',
            'modules',
            'email',
            'templates',
            'handlebars'
          ),
          join(
            process.cwd(),
            'dist',
            'modules',
            'email',
            'templates',
            'handlebars'
          ),
        ];

        let templatesDir: string | undefined;

        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            templatesDir = path;
            console.log(`✅ Using email templates from: ${path}`);

            const files = fs
              .readdirSync(path)
              .filter((f) => f.endsWith('.hbs'));
            console.log(
              `📧 Found ${files.length} templates:`,
              files.map((f) => f.replace('.hbs', '')).join(', ')
            );
            break;
          }
        }

        if (!templatesDir) {
          console.error('❌ Templates not found in any of these locations:');
          possiblePaths.forEach((p) => console.error(`   - ${p}`));
          throw new Error('Email templates directory not found!');
        }

        return {
          transport: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USERNAME,
              pass: process.env.SMTP_PASSWORD,
            },
            pool: true,
            maxConnections: parseInt(process.env.SMTP_POOL_SIZE || '5'),
            maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES || '100'),
          },
          defaults: {
            from: {
              name: process.env.SMTP_FROM_NAME || 'No Reply',
              address: process.env.SMTP_FROM_EMAIL || 'noreply@example.com',
            },
          },
          template: {
            dir: templatesDir,
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
          preview: process.env.NODE_ENV === 'development',
        };
      },
    }),
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailTemplatesService,
    SendGridProvider,
    SMTPProvider,
  ],
  exports: [EmailService, EmailTemplatesService, MailerModule],
})
export class EmailModule {}
