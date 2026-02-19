import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TodoEvent } from 'src/events/todo.events';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  async process(job: Job) {
    switch (job.name) {
      case TodoEvent.CREATED:
        // send actual notification to user
        console.log(
          `[Queue] Sending created notification for todo: ${job.data.title}`,
        );
        break;
      case TodoEvent.COMPLETED:
        console.log(
          `[Queue] Sending completed notification for todo: ${job.data.title}`,
        );
        break;
      default:
        console.log(`[Queue] Unknown job: ${job.name}`);
    }
  }
}
