import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.cacheManager.set('health:ping', 'pong', 1000);
      await this.cacheManager.get('health:ping');
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }
}
