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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  PermissionAction,
  PermissionModule,
} from '../../common/enums/permission.enum';

@ApiBearerAuth()
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermission(PermissionModule.Users, PermissionAction.Create)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @RequirePermission(PermissionModule.Users, PermissionAction.Read)
  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAllPaginated(
      { search: query.search, roleId: query.roleId },
      query.page,
      query.limit,
    );
  }

  @RequirePermission(PermissionModule.Users, PermissionAction.Read)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.findByIdSafe(id);
  }

  @RequirePermission(PermissionModule.Users, PermissionAction.Update)
  @Patch(':id')
  update(
    @CurrentUser('sub') currentUserId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    if (currentUserId === id) {
      throw new BadRequestException('Cannot modify your own account');
    }
    return this.usersService.adminUpdate(id, dto);
  }

  @RequirePermission(PermissionModule.Users, PermissionAction.Delete)
  @Delete(':id')
  async remove(
    @CurrentUser('sub') currentUserId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    if (currentUserId === id) {
      throw new BadRequestException('Cannot delete your own account');
    }
    await this.usersService.softDelete(id);
  }
}
