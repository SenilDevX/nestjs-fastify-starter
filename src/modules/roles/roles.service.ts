import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './roles.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginatedResult } from '../../common/types';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  async create(dto: CreateRoleDto): Promise<RoleDocument> {
    const existing = await this.roleModel.findOne({ name: dto.name });
    if (existing) throw new ConflictException('Role name already exists');

    return this.roleModel.create({
      name: dto.name,
      description: dto.description ?? null,
      permissions: dto.permissions,
      ...(dto.requiresTwoFactor !== undefined && {
        requiresTwoFactor: dto.requiresTwoFactor,
      }),
    });
  }

  async findAll(page = 1, limit = 10): Promise<PaginatedResult<RoleDocument>> {
    const filter = { deletedAt: null };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.roleModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.roleModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<RoleDocument> {
    const role = await this.roleModel.findOne({ _id: id, deletedAt: null });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDocument> {
    const existing = await this.roleModel.findOne({ _id: id, deletedAt: null });
    if (!existing) throw new NotFoundException('Role not found');

    if (existing.isSystem && dto.name !== undefined) {
      throw new BadRequestException('Cannot rename a system role');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.permissions !== undefined) updateData.permissions = dto.permissions;
    if (dto.requiresTwoFactor !== undefined) {
      updateData.requiresTwoFactor = dto.requiresTwoFactor;
    }

    const role = await this.roleModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      updateData,
      { new: true },
    );
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async delete(id: string): Promise<void> {
    const role = await this.roleModel.findOne({ _id: id, deletedAt: null });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete a system role');
    }

    await this.roleModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
    );
  }
}
