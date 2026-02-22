import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AuditsService } from './audits.service';
import { ListAuditsQueryDto } from './dto/list-audits-query.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Module, PermissionAction } from '../../common/enums';

@ApiCookieAuth()
@ApiTags('Audits')
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @RequirePermission(Module.Audits, PermissionAction.Read)
  @Get()
  findAll(@Query() query: ListAuditsQueryDto) {
    return this.auditsService.findAll(
      {
        module: query.module,
        recordId: query.recordId,
        userId: query.userId,
        action: query.action,
        fromDate: query.fromDate,
        toDate: query.toDate,
      },
      query.page,
      query.limit,
    );
  }
}
