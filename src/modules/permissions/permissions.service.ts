import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from './permissions.schema';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
  ) {}

  async findAll(): Promise<PermissionDocument[]> {
    return this.permissionModel.find().sort({ module: 1, action: 1 });
  }

  async findByIds(ids: string[]): Promise<PermissionDocument[]> {
    return this.permissionModel.find({ _id: { $in: ids } });
  }
}
