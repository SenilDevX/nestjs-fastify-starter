import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditAction, Module, PermissionAction } from '../../common/enums';
import { AuditsService } from '../audits/audits.service';

@ApiBearerAuth()
@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly auditsService: AuditsService,
  ) {}

  @RequirePermission(Module.Roles, PermissionAction.Create)
  @Post()
  async create(
    @Req() req: FastifyRequest,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRoleDto,
  ) {
    const role = await this.rolesService.create(dto);
    await this.auditsService.log({
      module: Module.Roles,
      recordId: role._id.toString(),
      action: AuditAction.Created,
      userId,
      ipAddress: req.ip,
      newValues: {
        name: dto.name,
        description: dto.description ?? null,
        permissions: dto.permissions,
        requiresTwoFactor: dto.requiresTwoFactor ?? false,
      },
    });
    return role;
  }

  @RequirePermission(Module.Roles, PermissionAction.Read)
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.rolesService.findAll(query.page, query.limit);
  }

  @RequirePermission(Module.Roles, PermissionAction.Read)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.rolesService.findById(id);
  }

  @RequirePermission(Module.Roles, PermissionAction.Update)
  @Patch(':id')
  async update(
    @Req() req: FastifyRequest,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const before = await this.rolesService.findById(id);
    const role = await this.rolesService.update(id, dto);
    await this.auditsService.log({
      module: Module.Roles,
      recordId: id,
      action: AuditAction.Updated,
      userId,
      ipAddress: req.ip,
      previousValues: {
        name: before.name,
        description: before.description,
        permissions: before.permissions,
        requiresTwoFactor: before.requiresTwoFactor,
        isActive: before.isActive,
      },
      newValues: { ...dto },
    });
    return role;
  }

  @RequirePermission(Module.Roles, PermissionAction.Delete)
  @Delete(':id')
  async remove(
    @Req() req: FastifyRequest,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const role = await this.rolesService.findById(id);
    await this.rolesService.delete(id);
    await this.auditsService.log({
      module: Module.Roles,
      recordId: id,
      action: AuditAction.Deleted,
      userId,
      ipAddress: req.ip,
      previousValues: { name: role.name },
    });
  }
}
