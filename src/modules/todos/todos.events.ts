export enum TodoEvent {
  CREATED = 'todo.created',
  COMPLETED = 'todo.completed',
}

export class TodoCreatedEvent {
  constructor(
    public readonly todoId: string,
    public readonly title: string,
  ) {}
}

export class TodoCompletedEvent {
  constructor(
    public readonly todoId: string,
    public readonly title: string,
  ) {}
}
