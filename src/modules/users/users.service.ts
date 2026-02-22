import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User, UserDocument } from './users.schema';
import { Role, RoleDocument } from '../roles/roles.schema';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginatedResult } from '../../common/types';

const SALT_ROUNDS = 12;

const SENSITIVE_FIELDS =
  '-password -twoFactorSecret -twoFactorTempSecret -passwordResetToken -passwordResetExpires';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    private readonly mailService: MailService,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: id, deletedAt: null });
  }

  async findByResetToken(hashedToken: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      deletedAt: null,
    });
  }

  async create(
    data: { firstName: string; lastName: string; email: string },
    hashedPassword: string,
    options?: {
      mustChangePassword?: boolean;
      mustSetupTwoFactor?: boolean;
      roleId?: string;
    },
  ): Promise<UserDocument> {
    return this.userModel.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      ...(options?.mustChangePassword && { mustChangePassword: true }),
      ...(options?.mustSetupTwoFactor && { mustSetupTwoFactor: true }),
      ...(options?.roleId && { roleId: new Types.ObjectId(options.roleId) }),
    });
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    const user = await this.create(
      { firstName: dto.firstName, lastName: dto.lastName, email: dto.email },
      hashedPassword,
      {
        mustChangePassword: true,
        ...(dto.requireTwoFactorSetup && { mustSetupTwoFactor: true }),
        roleId: dto.roleId,
      },
    );

    await this.mailService.sendWelcomeEmail(dto.email, tempPassword);

    return {
      id: user._id.toString(),
      email: user.email,
    };
  }

  async findByIdWithRole(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ _id: id, deletedAt: null })
      .populate('roleId');
  }

  async updateById(
    id: string,
    update: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      update,
      { new: true },
    );
  }

  async adminUpdate(
    id: string,
    dto: { roleId?: string; twoFactorEnabled?: boolean },
  ): Promise<UserDocument> {
    const user = await this.userModel.findOne({ _id: id, deletedAt: null });
    if (!user) throw new NotFoundException('User not found');

    if (dto.roleId !== undefined) {
      user.roleId = new Types.ObjectId(dto.roleId);
    }

    if (dto.twoFactorEnabled === true) {
      // Only act if user doesn't already have 2FA enabled or pending
      if (!user.isTwoFactorEnabled && !user.mustSetupTwoFactor) {
        user.mustSetupTwoFactor = true;
      }
    } else if (dto.twoFactorEnabled === false) {
      if (user.roleId) {
        const role = await this.roleModel.findById(user.roleId);
        if (role?.requiresTwoFactor) {
          throw new BadRequestException(
            'Cannot disable 2FA — required by role',
          );
        }
      }
      user.isTwoFactorEnabled = false;
      user.twoFactorSecret = null;
      user.twoFactorTempSecret = null;
      user.mustSetupTwoFactor = false;
    }

    await user.save();
    return this.findByIdSafe(user._id.toString());
  }

  async findAllPaginated(
    options: { search?: string; roleId?: string },
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<UserDocument>> {
    const filter: QueryFilter<UserDocument> = { deletedAt: null };

    if (options.search) {
      filter.email = { $regex: options.search, $options: 'i' };
    }
    if (options.roleId) {
      filter.roleId = new Types.ObjectId(options.roleId);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(SENSITIVE_FIELDS)
        .populate('roleId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.userModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdSafe(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ _id: id, deletedAt: null })
      .select(SENSITIVE_FIELDS)
      .populate('roleId');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.userModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
    );
    if (!user) throw new NotFoundException('User not found');
  }

  private generateTempPassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;

    const bytes = randomBytes(16);
    const chars = [
      upper[bytes[0] % upper.length],
      lower[bytes[1] % lower.length],
      digits[bytes[2] % digits.length],
      special[bytes[3] % special.length],
    ];

    for (let i = 4; i < 16; i++) {
      chars.push(all[bytes[i] % all.length]);
    }

    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomBytes(1)[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }
}
