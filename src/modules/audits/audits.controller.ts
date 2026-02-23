import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AuditsService } from './audits.service';
import { ListAuditsQueryDto } from './dto/list-audits-query.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Module, PermissionAction } from '../../common/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiCookieAuth()
@ApiTags('Audits')
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @RequirePermission(Module.Audits, PermissionAction.Read)
  @Get()
  findAll(
    @CurrentUser('permissions') permissions: string[],
    @Query() query: ListAuditsQueryDto,
  ) {
    const allowedModules = Object.values(Module).filter((mod) =>
      permissions.includes(`${mod}.read`),
    );

    return this.auditsService.findAll(
      {
        module: query.module,
        recordId: query.recordId,
        userId: query.userId,
        action: query.action,
        fromDate: query.fromDate,
        toDate: query.toDate,
        s: query.s,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      query.page,
      query.limit,
      allowedModules,
    );
  }

  @RequirePermission(Module.Audits, PermissionAction.Read)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.auditsService.findOne(id);
  }
}
