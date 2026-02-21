import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Logger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import { MailEvent } from './mail.events';

interface PasswordResetJobData {
  email: string;
  token: string;
}

@Processor('mail')
export class MailProcessor extends WorkerHost {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async process(job: Job<PasswordResetJobData>) {
    try {
      switch (job.name as MailEvent) {
        case MailEvent.PASSWORD_RESET:
          await this.sendPasswordResetEmail(job.data);
          break;
        default:
          this.logger.warn(
            { jobName: job.name },
            'Unknown mail job',
            MailProcessor.name,
          );
      }
    } catch (error: unknown) {
      this.logger.error(
        { jobId: job.id, jobName: job.name, error: String(error) },
        'Mail job failed',
        MailProcessor.name,
      );
      throw error;
    }
  }

  private async sendPasswordResetEmail(data: PasswordResetJobData) {
    const clientUrl = this.configService.get<string>('CLIENT_URL');
    const resetLink = `${clientUrl}/reset-password?token=${data.token}`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: data.email,
      subject: 'Reset Your Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    this.logger.log(
      { email: data.email },
      'Password reset email sent',
      MailProcessor.name,
    );
  }
}
