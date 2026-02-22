import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  PermissionAction,
  PermissionModule,
} from '../../common/enums/permission.enum';

@ApiBearerAuth()
@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermission(PermissionModule.Roles, PermissionAction.Create)
  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @RequirePermission(PermissionModule.Roles, PermissionAction.Read)
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @RequirePermission(PermissionModule.Roles, PermissionAction.Read)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.rolesService.findById(id);
  }

  @RequirePermission(PermissionModule.Roles, PermissionAction.Update)
  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  @RequirePermission(PermissionModule.Roles, PermissionAction.Delete)
  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.rolesService.delete(id);
  }
}
