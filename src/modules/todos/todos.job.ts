import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';

@Injectable()
export class TodosJob {
  constructor(private readonly logger: Logger) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  logTodos() {
    this.logger.log('Todos cron job running', TodosJob.name);
  }
}
