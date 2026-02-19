import { NotFoundException } from '@nestjs/common';
import { Model, Document, UpdateQuery, QueryFilter } from 'mongoose';
import type { Cache } from 'cache-manager';
import { PaginatedResult } from './types';

interface CacheConfig {
  cache: Cache;
  prefix: string;
}

export abstract class BaseService<T extends Document> {
  constructor(
    protected readonly model: Model<T>,
    private readonly cacheConfig?: CacheConfig,
  ) {}

  private async getFromCache<R>(key: string): Promise<R | undefined> {
    if (!this.cacheConfig) return undefined;
    return this.cacheConfig.cache.get<R>(key);
  }

  private async setCache(key: string, value: unknown): Promise<void> {
    if (!this.cacheConfig) return;
    await this.cacheConfig.cache.set(key, value);
  }

  private async deleteCache(key: string): Promise<void> {
    if (!this.cacheConfig) return;
    await this.cacheConfig.cache.del(key);
  }

  private async invalidateListCache(): Promise<void> {
    if (!this.cacheConfig) return;
    const { cache, prefix } = this.cacheConfig;
    const current = (await cache.get<number>(`${prefix}_list:version`)) ?? 0;
    await cache.set(`${prefix}_list:version`, current + 1);
  }

  protected afterCreate(_doc: T): void | Promise<void> {}
  protected afterUpdate(
    _id: string,
    _dto: UpdateQuery<T>,
    _doc: T,
  ): void | Promise<void> {}
  protected afterRemove(_id: string): void | Promise<void> {}

  async create(dto: Partial<T>): Promise<T> {
    const doc = await this.model.create(dto);
    await this.invalidateListCache();
    await this.afterCreate(doc);
    return doc;
  }

  async findAll(
    filter: QueryFilter<T> = {},
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<T>> {
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * limit;
    const baseFilter = { ...filter, isDeleted: false };

    if (this.cacheConfig) {
      const { prefix } = this.cacheConfig;
      const version =
        (await this.getFromCache<number>(`${prefix}_list:version`)) ?? 0;
      const cacheKey = `${prefix}_list:v${version}:p${safePage}:l${limit}`;

      const cached = await this.getFromCache<PaginatedResult<T>>(cacheKey);
      if (cached) return cached;

      const result = await this.queryFindAll(baseFilter, skip, limit, safePage);
      await this.setCache(cacheKey, result);
      return result;
    }

    return this.queryFindAll(baseFilter, skip, limit, safePage);
  }

  private async queryFindAll(
    baseFilter: QueryFilter<T>,
    skip: number,
    limit: number,
    page: number,
  ): Promise<PaginatedResult<T>> {
    const [items, total] = await Promise.all([
      this.model
        .find(baseFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(baseFilter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<T> {
    if (this.cacheConfig) {
      const cached = await this.getFromCache<T>(
        `${this.cacheConfig.prefix}_${id}`,
      );
      if (cached) return cached;
    }

    const doc = await this.model.findOne({
      _id: id,
      isDeleted: false,
    } as QueryFilter<T>);
    if (!doc) throw new NotFoundException('Record not found');

    if (this.cacheConfig) {
      await this.setCache(`${this.cacheConfig.prefix}_${id}`, doc);
    }

    return doc;
  }

  async update(id: string, dto: UpdateQuery<T>): Promise<T> {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: false } as QueryFilter<T>,
      dto,
      { new: true },
    );
    if (!doc) throw new NotFoundException('Record not found');

    if (this.cacheConfig) {
      await this.deleteCache(`${this.cacheConfig.prefix}_${id}`);
      await this.invalidateListCache();
    }

    await this.afterUpdate(id, dto, doc);
    return doc;
  }

  async remove(id: string): Promise<void> {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: false } as QueryFilter<T>,
      { isDeleted: true } as UpdateQuery<T>,
    );
    if (!doc) throw new NotFoundException('Record not found');

    if (this.cacheConfig) {
      await this.deleteCache(`${this.cacheConfig.prefix}_${id}`);
      await this.invalidateListCache();
    }

    await this.afterRemove(id);
  }
}
