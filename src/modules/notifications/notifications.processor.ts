import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from 'nestjs-pino';
import { TodoEvent } from 'src/events/todo.events';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly logger: Logger) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case TodoEvent.CREATED:
        this.logger.log(
          { todoId: job.data.todoId, title: job.data.title },
          'Sending created notification',
          NotificationsProcessor.name,
        );
        break;
      case TodoEvent.COMPLETED:
        this.logger.log(
          { todoId: job.data.todoId, title: job.data.title },
          'Sending completed notification',
          NotificationsProcessor.name,
        );
        break;
      default:
        this.logger.warn(
          { jobName: job.name },
          'Unknown notification job',
          NotificationsProcessor.name,
        );
    }
  }
}
