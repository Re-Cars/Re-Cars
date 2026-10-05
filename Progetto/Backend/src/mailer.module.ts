import { Logger, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { BrevoTransport } from './brevo.transport';

/**
 * Invio email. Con BREVO_API_KEY le email partono dall'API HTTP di Brevo
 * (l'unico modo su Render gratuito, che blocca l'SMTP); senza, via SMTP
 * Gmail con MAIL_USER/MAIL_PASS (va bene in locale).
 */
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        const chiave = process.env.BREVO_API_KEY;
        const indirizzo =
          process.env.BREVO_MITTENTE || process.env.MAIL_USER || '';
        if (chiave) {
          if (!indirizzo) {
            new Logger('Email').warn(
              'BREVO_API_KEY senza BREVO_MITTENTE né MAIL_USER: Brevo rifiuterà le email.',
            );
          }
          return {
            transport: new BrevoTransport(chiave, {
              email: indirizzo,
              name: 'RE|CARS',
            }),
          };
        }
        return {
          transport: {
            host: 'smtp.gmail.com',
            port: 587,
            // senza limiti un server SMTP irraggiungibile tiene appesa la
            // richiesta per minuti (Render gratuito blocca le porte SMTP)
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 20_000,
            auth: {
              user: process.env.MAIL_USER,
              pass: process.env.MAIL_PASS,
            },
          },
          defaults: {
            from: `"RE|CARS" <${process.env.MAIL_USER ?? 'noreply@recars.it'}>`,
          },
        };
      },
    }),
  ],
  exports: [MailerModule],
})
export class AppMailerModule {}
