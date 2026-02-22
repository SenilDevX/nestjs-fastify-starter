import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../types';
import { UsersService } from '../../modules/users/users.service';
import { RolesService } from '../../modules/roles/roles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) return true;

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user: JwtPayload }>();
    const userId = request.user?.sub;

    const user = await this.usersService.findById(userId);
    if (!user?.roleId) {
      throw new ForbiddenException('No role assigned');
    }

    const role = await this.rolesService.findById(user.roleId.toString());

    if (!role.isActive) {
      throw new ForbiddenException('Role is inactive');
    }

    if (!role.permissions.includes(requiredPermission)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
