import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './users.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: id, isDeleted: false });
  }

  async findByResetToken(hashedToken: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      isDeleted: false,
    });
  }

  async create(
    email: string,
    hashedPassword: string,
    options?: { mustChangePassword?: boolean; mustSetupTwoFactor?: boolean },
  ): Promise<UserDocument> {
    return this.userModel.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      ...(options?.mustChangePassword && { mustChangePassword: true }),
      ...(options?.mustSetupTwoFactor && { mustSetupTwoFactor: true }),
    });
  }

  async updateById(
    id: string,
    update: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      update,
      { new: true },
    );
  }
}
