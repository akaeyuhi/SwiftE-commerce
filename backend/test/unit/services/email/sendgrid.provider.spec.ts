import { SendGridProvider } from 'src/modules/email/providers/sendgrid.provider';
import * as sgMail from '@sendgrid/mail';
import { EmailData } from 'src/common/interfaces/infrastructure/email.interface';

describe('SendGridProvider', () => {
  let provider: SendGridProvider;
  const originalApiKey = process.env.SENDGRID_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SENDGRID_API_KEY;
    provider = new SendGridProvider();
  });

  afterAll(() => {
    process.env.SENDGRID_API_KEY = originalApiKey;
  });

  it('should warn when API key not configured', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    new SendGridProvider();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should set API key when configured', () => {
    process.env.SENDGRID_API_KEY = 'test-key';
    const setApiKeySpy = jest.spyOn(sgMail, 'setApiKey');
    provider = new SendGridProvider();
    expect(setApiKeySpy).toHaveBeenCalledWith('test-key');
  });

  describe('send', () => {
    const emailData: EmailData = {
      to: [{ email: 'a@b.com', name: 'A B' }],
      subject: 'Sub',
      html: '<p>Hi</p>',
      text: 'Hi',
      tags: ['test'],
      metadata: { key: 'value' },
    };

    it('should return success when sgMail.send resolves', async () => {
      const mockResponse = [
        {
          statusCode: 202,
          headers: { 'x-message-id': 'msg-1' },
        },
      ];
      jest.spyOn(sgMail, 'send').mockResolvedValue(mockResponse as any);

      const result = await provider.send(emailData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-1');
      expect(result.provider).toBe('sendgrid');
      expect(result.metadata?.statusCode).toBe(202);
    });

    it('should return failure when sgMail.send rejects', async () => {
      jest.spyOn(sgMail, 'send').mockRejectedValue(new Error('fail'));

      const result = await provider.send(emailData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('fail');
      expect(result.provider).toBe('sendgrid');
    });
  });

  describe('healthCheck', () => {
    it('should return false if no API key', async () => {
      delete process.env.SENDGRID_API_KEY;
      expect(await provider.healthCheck()).toBe(false);
    });

    it('should return true if API key present', async () => {
      process.env.SENDGRID_API_KEY = 'key';
      expect(await provider.healthCheck()).toBe(true);
    });
  });

  describe('formatEmail', () => {
    it('should format EmailData to MailDataRequired', () => {
      process.env.SENDGRID_FROM_EMAIL = 'from@example.com';
      process.env.SENDGRID_FROM_NAME = 'Sender';
      const emailData: EmailData = {
        to: [{ email: 'a@b.com', name: 'A B' }],
        subject: 'Sub',
        html: '<p>Hi</p>',
        text: 'Hi',
        attachments: [
          {
            filename: 'file.txt',
            content: Buffer.from('hello'),
            contentType: 'text/plain',
            cid: 'cid1',
          },
        ],
        tags: ['tag1'],
        metadata: { foo: 'bar' },
      };

      const formatted = (provider as any).formatEmail(emailData);

      expect(formatted.from).toEqual({
        email: 'from@example.com',
        name: 'Sender',
      });
      expect(formatted.to).toEqual([{ email: 'a@b.com', name: 'A B' }]);
      expect(formatted.attachments![0].content).toEqual('aGVsbG8=');
      expect(formatted.categories).toEqual(['tag1']);
      expect(formatted.customArgs).toEqual({ foo: 'bar' });
    });
  });
});
