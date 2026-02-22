export enum Module {
  Users = 'users',
  Roles = 'roles',
  Permissions = 'permissions',
  Todos = 'todos',
  Audits = 'audits',
}

export enum PermissionAction {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export enum AuditAction {
  Created = 'created',
  Updated = 'updated',
  Deleted = 'deleted',
}
