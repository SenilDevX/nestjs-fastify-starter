import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailEvent } from './mail.events';

@Injectable()
export class MailService {
  constructor(@InjectQueue('mail') private readonly mailQueue: Queue) {}

  async sendPasswordReset(email: string, token: string) {
    await this.mailQueue.add(MailEvent.PASSWORD_RESET, { email, token });
  }
}
