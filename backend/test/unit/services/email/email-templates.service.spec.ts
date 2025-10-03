import { EmailTemplatesService } from 'src/modules/email/templates/email-templates.service';
import { EmailJobType } from 'src/common/enums/email.enum';
import { EmailTemplate } from 'src/common/interfaces/infrastructure/email.interface';
import * as fs from 'node:fs';

describe('EmailTemplatesService', () => {
  let service: EmailTemplatesService;
  const mailer = { sendMail: jest.fn() };

  beforeEach(() => {
    service = new EmailTemplatesService(mailer as any);
  });

  it('should initialize all templates', () => {
    const all = service.getAvailableTemplates();
    expect(all.length).toBeGreaterThan(0);
    expect(service.getTemplate(EmailJobType.WELCOME)?.templateFile).toBe(
      'welcome'
    );
  });

  it('getTemplatesByCategory filters correctly', () => {
    const onboarding = service.getTemplatesByCategory('onboarding');
    expect(onboarding.has(EmailJobType.WELCOME)).toBe(true);
    expect(onboarding.has(EmailJobType.USER_CONFIRMATION)).toBe(false);
  });

  it('renderSubject replaces variables', () => {
    const subj = 'Hello {{name}}';
    expect(service.renderSubject(subj, { name: 'Alice' })).toBe('Hello Alice');
  });

  it('renderTemplate processes html, text, subject', () => {
    const tmpl: EmailTemplate = {
      subject: 'Hi {{name}}',
      html: '<p>{{name}}</p>',
      text: 'Text {{name}}',
    };
    const out = service.renderTemplate(tmpl, { name: 'Bob' });
    expect(out.subject).toBe('Hi Bob');
    expect(out.html).toBe('<p>Bob</p>');
    expect(out.text).toBe('Text Bob');
  });

  it('previewTemplate returns config and rendered subject', async () => {
    const ctx = { orderNumber: '123' };
    const preview = await service.previewTemplate(
      EmailJobType.ORDER_CONFIRMATION,
      ctx
    );
    expect(preview.templateFile).toBe('order-confirmation');
    expect(preview.subject).toContain('123');
  });

  it('validateTemplates reports missing when fs missing', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
    const res = await service.validateTemplates();
    expect(res.valid).toBe(false);
    expect(res.missing.length).toBeGreaterThan(0);
  });
});
