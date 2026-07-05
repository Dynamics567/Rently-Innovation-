import { Column, Entity, Index, OneToOne } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@common/base/base.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserAccountStatus } from '../enums/verification-status.enum';
import { ProviderProfile } from './provider-profile.entity';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'citext', nullable: true })
  email?: string;

  @Index({ unique: true, where: '"phone" IS NOT NULL' })
  @Column({ type: 'text', nullable: true })
  phone?: string;

  /** Never serialized to a client — see UserResponseDto / ClassSerializerInterceptor. */
  @Exclude()
  @Column({ name: 'password_hash', type: 'text', nullable: true })
  passwordHash?: string;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({ type: 'enum', enum: UserRole, array: true, default: [UserRole.RENTER] })
  roles: UserRole[];

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ name: 'phone_verified_at', type: 'timestamptz', nullable: true })
  phoneVerifiedAt?: Date | null;

  @Column({ type: 'enum', enum: UserAccountStatus, default: UserAccountStatus.ACTIVE })
  status: UserAccountStatus;

  @OneToOne(() => ProviderProfile, (profile) => profile.user)
  providerProfile?: ProviderProfile;

  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  isVerifiedForTransactions(): boolean {
    return Boolean(this.emailVerifiedAt || this.phoneVerifiedAt);
  }
}
