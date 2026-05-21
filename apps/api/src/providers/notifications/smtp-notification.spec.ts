import { SmtpNotificationProvider } from './smtp.notification.provider';
import type { Transporter } from 'nodemailer';

function makeFakeTransporter(): {
  transporter: Transporter;
  calls: Array<Record<string, unknown>>;
} {
  const calls: Array<Record<string, unknown>> = [];
  const transporter = {
    sendMail: async (opts: Record<string, unknown>) => {
      calls.push(opts);
      return { messageId: '<test-id@local>' };
    },
  } as unknown as Transporter;
  return { transporter, calls };
}

describe('SmtpNotificationProvider', () => {
  it('formats from header with display name and forwards to transporter', async () => {
    const { transporter, calls } = makeFakeTransporter();
    const p = new SmtpNotificationProvider({
      host: 'localhost',
      port: 1025,
      secure: false,
      fromAddress: 'noreply@example.com',
      fromName: 'BidReady KSA',
      transporter,
    });
    const r = await p.send({
      organizationId: 'org-1',
      to: 'user@example.com',
      subject: 'hi',
      body: 'hello',
    });
    expect(r.channel).toBe('email');
    expect(r.externalId).toBe('<test-id@local>');
    expect(calls[0].from).toBe('"BidReady KSA" <noreply@example.com>');
    expect(calls[0].to).toBe('user@example.com');
    expect(calls[0].subject).toBe('hi');
    expect(calls[0].text).toBe('hello');
  });

  it('omits display name when fromName is unset', async () => {
    const { transporter, calls } = makeFakeTransporter();
    const p = new SmtpNotificationProvider({
      host: 'localhost',
      port: 1025,
      secure: false,
      fromAddress: 'noreply@example.com',
      transporter,
    });
    await p.send({
      organizationId: 'org-1',
      to: 'user@example.com',
      body: 'hello',
    });
    expect(calls[0].from).toBe('noreply@example.com');
    expect(calls[0].subject).toBe('(no subject)');
  });
});
