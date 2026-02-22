import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Module, PermissionAction } from '../../common/enums';

@ApiCookieAuth()
@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @RequirePermission(Module.Permissions, PermissionAction.Read)
  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }
}
