import { NotFoundException } from '@nestjs/common';
import { Model, Document, UpdateQuery, QueryFilter } from 'mongoose';
import { PaginatedResult } from './types';

export abstract class BaseService<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async create(dto: Partial<T>): Promise<T> {
    return this.model.create(dto);
  }

  async findAll(
    filter: QueryFilter<T> = {},
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<T>> {
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * limit;
    const baseFilter = { ...filter, isDeleted: false };

    const [data, total] = await Promise.all([
      this.model.find(baseFilter).skip(skip).limit(limit),
      this.model.countDocuments(baseFilter),
    ]);

    return {
      items: data,
      total,
      page: safePage,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<T> {
    const doc = await this.model.findOne({
      _id: id,
      isDeleted: false,
    } as QueryFilter<T>);
    if (!doc) throw new NotFoundException('Record not found');
    return doc;
  }

  async update(id: string, dto: UpdateQuery<T>): Promise<T> {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: false } as QueryFilter<T>,
      dto,
      { new: true },
    );
    if (!doc) throw new NotFoundException('Record not found');
    return doc;
  }

  async remove(id: string): Promise<void> {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: false } as QueryFilter<T>,
      { isDeleted: true } as UpdateQuery<T>,
    );
    if (!doc) throw new NotFoundException('Record not found');
  }
}
