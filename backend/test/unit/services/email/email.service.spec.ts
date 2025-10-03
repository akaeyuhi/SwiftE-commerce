import { EmailService } from 'src/modules/email/email.service';
import { EmailTemplatesService } from 'src/modules/email/templates/email-templates.service';
import { SendGridProvider } from 'src/modules/email/providers/sendgrid.provider';
import { SMTPProvider } from 'src/modules/email/providers/smtp.provider';
import { EmailData } from 'src/common/interfaces/infrastructure/email.interface';
import { EmailJobType } from 'src/common/enums/email.enum';

describe('EmailService', () => {
  let service: EmailService;
  let templates: Partial<EmailTemplatesService>;
  let sg: Partial<SendGridProvider>;
  let smtp: Partial<SMTPProvider>;

  beforeEach(() => {
    templates = {
      getTemplate: jest.fn().mockReturnValue({
        templateFile: 'tpl',
        subject: 'Hi {{name}}',
        category: 'cat',
      }),
      sendTemplatedEmail: jest.fn().mockResolvedValue({ success: true }),
    } as any;
    sg = {
      name: 'sendgrid',
      send: jest.fn().mockResolvedValue({ success: true }),
      healthCheck: jest.fn().mockResolvedValue(true),
    } as any;
    smtp = {
      name: 'smtp',
      send: jest.fn().mockResolvedValue({ success: true }),
      healthCheck: jest.fn().mockResolvedValue(true),
    } as any;
    service = new EmailService(templates as any, sg as any, smtp as any);
  });

  it('should send templated email when templateId and jobType provided', async () => {
    const data: EmailData = {
      to: [{ email: 'a@b.com' }],
      subject: '',
      templateId: 'tpl',
      templateData: { name: 'X' } as any,
    } as EmailData;
    await service.sendEmail(data, EmailJobType.WELCOME);
    expect(templates.sendTemplatedEmail).toHaveBeenCalledWith(
      EmailJobType.WELCOME,
      data.templateData,
      expect.any(Object)
    );
  });

  it('should send direct email via primary provider when no templateId', async () => {
    const data: EmailData = {
      to: [{ email: 'a@b.com' }],
      subject: 'S',
      html: '<p>hi</p>',
    };
    delete data.templateId;
    await service.sendEmail(data);
    expect(sg.send).toHaveBeenCalledWith(data);
  });

  it('should fallback to SMTP if primary fails', async () => {
    sg.send = jest.fn().mockResolvedValue({ success: false });
    smtp.send = jest.fn().mockResolvedValue({ success: true });
    const data: EmailData = {
      to: [{ email: 'a@b.com' }],
      subject: 'S',
      html: '<p>hi</p>',
    };
    await service.sendEmail(data);
    expect(smtp.send).toHaveBeenCalled();
  });

  it('healthCheck returns providers array', async () => {
    const res = await service.healthCheck();
    expect(res.providers).toBeInstanceOf(Array);
    expect(res.healthy).toBe(true);
  });

  it('sendWithManualTemplate processes html/text and delegates to direct send', async () => {
    const data: EmailData = {
      to: [{ email: 'a@b.com' }],
      subject: 'S',
      templateData: { name: 'A' } as any,
    } as EmailData;
    jest
      .spyOn(templates as any, 'processTemplate')
      .mockReturnValue('processed');
    jest
      .spyOn(service as any, 'sendDirectEmail')
      .mockResolvedValue({ success: true } as any);
    const res = await (service as any).sendWithManualTemplate(
      data,
      'h-{{name}}',
      't-{{name}}'
    );
    expect(res.success).toBe(true);
    expect(service['sendDirectEmail']).toHaveBeenCalled();
  });

  it('validateEmailData throws on missing to', () => {
    const fn = () =>
      (service as any).validateEmailData({ to: [], subject: 'S' } as any);
    expect(fn).toThrow('At least one recipient is required');
  });

  it('validateEmailData throws on invalid email', () => {
    const data: EmailData = {
      to: [{ email: 'invalid' }],
      subject: 'S',
      html: '<p>',
    };
    const fn = () => (service as any).validateEmailData(data);
    expect(fn).toThrow('Invalid email address: invalid');
  });

  it('validateEmailData throws on missing content', () => {
    const data: EmailData = {
      to: [{ email: 'a@b.com' }],
      subject: '',
    } as EmailData;
    const fn = () => (service as any).validateEmailData(data);
    expect(fn).toThrow('Email subject is required');
  });
});
