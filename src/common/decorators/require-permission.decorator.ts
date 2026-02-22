import { SetMetadata } from '@nestjs/common';
import { Module, PermissionAction } from '../enums';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const RequirePermission = (module: Module, action: PermissionAction) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, `${module}.${action}`);
