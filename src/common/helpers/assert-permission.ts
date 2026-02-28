import { ForbiddenException } from '@nestjs/common';

/**
 * Throws 403 if the user lacks `module.action` in their permissions.
 * Use for service-layer permission checks on single-module endpoints.
 */
export const assertPermission = (
  permissions: string[],
  module: string,
  action: string,
): void => {
  if (!permissions.includes(`${module}.${action}`)) {
    throw new ForbiddenException('Insufficient permissions');
  }
};

/**
 * Throws 403 if the user lacks ALL of the given modules for the action.
 * Passes as long as at least one module is permitted.
 * Use for entities that map to multiple modules.
 */
export const assertAnyPermission = (
  permissions: string[],
  modules: string[],
  action: string,
): void => {
  const hasAny = modules.some((mod) =>
    permissions.includes(`${mod}.${action}`),
  );
  if (!hasAny) {
    throw new ForbiddenException('Insufficient permissions');
  }
};

/**
 * Returns the subset of modules the user has permission for.
 * Use for scoping list/stats queries to only the types the user can access.
 */
export const getPermittedModules = (
  permissions: string[],
  modules: string[],
  action: string,
): string[] =>
  modules.filter((mod) => permissions.includes(`${mod}.${action}`));
