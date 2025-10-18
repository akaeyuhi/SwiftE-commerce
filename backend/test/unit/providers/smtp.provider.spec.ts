import { SMTPProvider } from 'src/modules/email/providers/smtp.provider';
import { MailerService } from '@nestjs-modules/mailer';
import { SentMessageInfo } from 'nodemailer';
import { EmailData } from 'src/common/interfaces/infrastructure/email.interface';
import { Logger } from '@nestjs/common';

describe('SMTPProvider', () => {
  let provider: SMTPProvider;
  let mailer: Partial<MailerService>;

  beforeEach(() => {
    mailer = {
      sendMail: jest.fn(),
    };
    provider = new SMTPProvider(mailer as MailerService);
    jest.clearAllMocks();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USERNAME;
    delete process.env.SMTP_PASSWORD;
  });

  describe('healthCheck', () => {
    it('should warn when SMTP configuration is incomplete', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      new SMTPProvider(mailer as MailerService).healthCheck();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
    it('should return true when config complete', async () => {
      process.env.SMTP_HOST = 'h';
      process.env.SMTP_USERNAME = 'u';
      process.env.SMTP_PASSWORD = 'p';
      expect(await provider.healthCheck()).toBe(true);
    });
  });

  describe('send', () => {
    const emailData: EmailData = {
      to: [{ email: 'a@b.com', name: 'A B' }],
      subject: 'Sub',
      html: '<p>Hi</p>',
      tags: ['t1'],
      metadata: { m: 'v' },
    };

    it('should return success when sendMail resolves', async () => {
      const info: SentMessageInfo = {
        messageId: 'mid',
        response: 'resp',
        envelope: {},
        accepted: [],
        rejected: [],
        pending: [],
      };
      (mailer.sendMail as jest.Mock).mockResolvedValue(info);

      const result = await provider.send(emailData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mid');
      expect(result.provider).toBe('smtp');
      expect(result.metadata?.response).toBe('resp');
    });

    it('should return failure when sendMail rejects', async () => {
      (mailer.sendMail as jest.Mock).mockRejectedValue(new Error('smtp fail'));

      const result = await provider.send(emailData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('smtp fail');
    });
  });

  describe('formatEmail', () => {
    it('should format recipients and headers', () => {
      process.env.SMTP_FROM_EMAIL = 'from@example.com';
      process.env.SMTP_FROM_NAME = 'Sender';

      const emailData: EmailData = {
        to: [{ email: 'a@b.com', name: 'A B' }],
        cc: [{ email: 'c@d.com' }],
        bcc: [{ email: 'e@f.com', name: 'E F' }],
        subject: 'Sub',
        html: '<p>Hi</p>',
        text: 'Hi',
        tags: ['t1'],
        metadata: { key: 'val' },
        from: { email: 'custom@x.com', name: 'Custom' },
        priority: 4, // URGENT
        attachments: [
          {
            filename: 'file.txt',
            content: 'data',
            contentType: 'text/plain',
            cid: 'cid1',
          },
        ],
      };

      const opts = (provider as any).formatEmail(emailData);

      expect(opts.from).toEqual({ name: 'Custom', address: 'custom@x.com' });
      expect(opts.cc).toEqual(['c@d.com']);
      expect(opts.bcc).toEqual(['E F <e@f.com>']);
      expect(opts.headers['X-Tags']).toBe('t1');
      expect(opts.headers['X-Metadata']).toContain('"key":"val"');
      expect(opts.headers['X-Priority']).toBe('1 (Highest)');
      expect(opts.attachments![0]).toMatchObject({ filename: 'file.txt' });
    });
  });

  describe('sendTemplate', () => {
    it('should return success when sendMail resolves', async () => {
      (mailer.sendMail as jest.Mock).mockResolvedValue({
        messageId: 'tid',
        response: 'resp',
        envelope: {},
        accepted: [],
        rejected: [],
        pending: [],
      } as SentMessageInfo);

      const result = await provider.sendTemplate('tpl', { foo: 'bar' }, {
        to: [{ email: 'u@e.com', name: 'U E' }],
        subject: 'S',
        tags: ['tag'],
        metadata: {},
      } as any);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('tid');
      expect(result.metadata?.template).toBe('tpl');
    });

    it('should return failure when sendMail rejects', async () => {
      (mailer.sendMail as jest.Mock).mockRejectedValue(new Error('tpl fail'));

      const result = await provider.sendTemplate('tpl', {}, {
        to: [{ email: 'u@e.com' }],
        subject: 'S',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('tpl fail');
    });
  });

  describe('sendTestEmail & healthCheckWithTest', () => {
    it('should send a test email', async () => {
      jest.spyOn(provider, 'send').mockResolvedValue({ success: true } as any);

      const res = await provider.sendTestEmail('test@e.com');
      expect(provider.send).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('healthCheckWithTest returns configInvalid on missing config', async () => {
      const res = await provider.healthCheckWithTest('test@e.com');
      expect(res.healthy).toBe(false);
      expect(res.configValid).toBe(false);
    });

    it('healthCheckWithTest sends test email when configured', async () => {
      process.env.SMTP_HOST = 'h';
      process.env.SMTP_USERNAME = 'u';
      process.env.SMTP_PASSWORD = 'p';
      jest
        .spyOn(provider, 'sendTestEmail')
        .mockResolvedValue({ success: true } as any);

      const res = await provider.healthCheckWithTest('test@e.com');
      expect(res.healthy).toBe(true);
      expect(res.configValid).toBe(true);
      expect(res.testEmailSent).toBe(true);
    });

    it('healthCheckWithTest handles sendTestEmail failure', async () => {
      process.env.SMTP_HOST = 'h';
      process.env.SMTP_USERNAME = 'u';
      process.env.SMTP_PASSWORD = 'p';
      jest
        .spyOn(provider, 'sendTestEmail')
        .mockRejectedValue(new Error('fail'));

      const res = await provider.healthCheckWithTest('test@e.com');
      expect(res.healthy).toBe(false);
      expect(res.error).toBe('fail');
    });
  });
});
