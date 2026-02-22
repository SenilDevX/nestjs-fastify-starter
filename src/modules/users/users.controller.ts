import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditAction, Module, PermissionAction } from '../../common/enums';
import { AuditsService } from '../audits/audits.service';

@ApiCookieAuth()
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditsService: AuditsService,
  ) {}

  @RequirePermission(Module.Users, PermissionAction.Create)
  @Post()
  async create(
    @Req() req: FastifyRequest,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateUserDto,
  ) {
    const result = await this.usersService.createUser(dto);
    void this.auditsService.log({
      module: Module.Users,
      recordId: result.id,
      action: AuditAction.Created,
      userId,
      ipAddress: req.ip,
      newValues: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        roleId: dto.roleId,
      },
    });
    return result;
  }

  @RequirePermission(Module.Users, PermissionAction.Read)
  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAllPaginated(
      { search: query.search, roleId: query.roleId },
      query.page,
      query.limit,
    );
  }

  @RequirePermission(Module.Users, PermissionAction.Read)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.findByIdSafe(id);
  }

  @RequirePermission(Module.Users, PermissionAction.Update)
  @Patch(':id')
  async update(
    @Req() req: FastifyRequest,
    @CurrentUser('sub') currentUserId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    if (currentUserId === id) {
      throw new BadRequestException('Cannot modify your own account');
    }
    const before = await this.usersService.findById(id);
    const result = await this.usersService.adminUpdate(id, dto);
    void this.auditsService.log({
      module: Module.Users,
      recordId: id,
      action: AuditAction.Updated,
      userId: currentUserId,
      ipAddress: req.ip,
      previousValues: {
        roleId: before?.roleId?.toString() ?? null,
        isTwoFactorEnabled: before?.isTwoFactorEnabled,
        mustSetupTwoFactor: before?.mustSetupTwoFactor,
      },
      newValues: { ...dto },
    });
    return result;
  }

  @RequirePermission(Module.Users, PermissionAction.Delete)
  @Delete(':id')
  async remove(
    @Req() req: FastifyRequest,
    @CurrentUser('sub') currentUserId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    if (currentUserId === id) {
      throw new BadRequestException('Cannot delete your own account');
    }
    const user = await this.usersService.findByIdSafe(id);
    await this.usersService.softDelete(id);
    void this.auditsService.log({
      module: Module.Users,
      recordId: id,
      action: AuditAction.Deleted,
      userId: currentUserId,
      ipAddress: req.ip,
      previousValues: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  }
}
