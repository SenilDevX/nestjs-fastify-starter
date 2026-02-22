import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionModule } from '../enums/permission.enum';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const RequirePermission = (
  module: PermissionModule,
  action: PermissionAction,
) => SetMetadata(REQUIRE_PERMISSION_KEY, `${module}.${action}`);
