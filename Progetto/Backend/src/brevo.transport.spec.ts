import { createTransport } from 'nodemailer';
import { BrevoTransport, corpoBrevo } from './brevo.transport';

const mittente = { email: 'recars.app@gmail.com', name: 'RE|CARS' };

describe('corpoBrevo', () => {
  it('destinatari nei vari formati e allegato in base64', () => {
    const corpo = corpoBrevo(
      {
        to: ['"Mario Rossi" <mario@x.it>', { address: 'b@x.it' }],
        subject: 'Prova',
        html: '<b>ciao</b>',
        attachments: [
          { filename: 'appuntamento.ics', content: 'BEGIN:VCALENDAR' },
        ],
      },
      mittente,
    );
    expect(corpo).toEqual({
      sender: mittente,
      to: [{ email: 'mario@x.it', name: 'Mario Rossi' }, { email: 'b@x.it' }],
      subject: 'Prova',
      htmlContent: '<b>ciao</b>',
      attachment: [
        {
          name: 'appuntamento.ics',
          content: Buffer.from('BEGIN:VCALENDAR').toString('base64'),
        },
      ],
    });
  });

  it('senza destinatario è un errore', () => {
    expect(() => corpoBrevo({ subject: 'x' }, mittente)).toThrow();
  });
});

describe('BrevoTransport con Nodemailer (come MailerService)', () => {
  const risposta = (status: number, corpo: unknown) =>
    Promise.resolve(new Response(JSON.stringify(corpo), { status }));

  it("manda all'API di Brevo con la chiave nell'header", async () => {
    const fetchFn = jest.fn(() => risposta(201, { messageId: '<id@brevo>' }));
    const t = createTransport(
      new BrevoTransport('chiave-segreta', mittente, fetchFn as typeof fetch),
    );
    await t.sendMail({
      to: 'u@x.it',
      subject: '123456 è il tuo codice RE|CARS',
      html: '<p>123456</p>',
    });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe(
      'chiave-segreta',
    );
    expect(JSON.parse(init.body as string)).toMatchObject({
      sender: mittente,
      to: [{ email: 'u@x.it' }],
      htmlContent: '<p>123456</p>',
    });
  });

  it("un errore di Brevo arriva a chi manda l'email", async () => {
    const fetchFn = jest.fn(() =>
      risposta(400, { message: 'sender not valid' }),
    );
    const t = createTransport(
      new BrevoTransport('k', mittente, fetchFn as typeof fetch),
    );
    await expect(
      t.sendMail({ to: 'u@x.it', subject: 'x', html: 'x' }),
    ).rejects.toThrow(/Brevo HTTP 400.*sender not valid/);
  });
});
