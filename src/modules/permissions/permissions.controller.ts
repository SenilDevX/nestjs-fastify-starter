import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  PermissionAction,
  PermissionModule,
} from '../../common/enums/permission.enum';

@ApiBearerAuth()
@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @RequirePermission(PermissionModule.Permissions, PermissionAction.Read)
  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }
}
