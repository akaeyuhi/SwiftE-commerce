import { Injectable } from '@nestjs/common';
import { RefreshToken } from 'src/entities/user/authentication/refresh-token.entity';
import { User } from 'src/entities/user/user.entity';
import * as crypto from 'crypto';
import { RefreshTokenRepository } from 'src/modules/auth/refresh-token/refresh-token.repository';

@Injectable()
export class RefreshTokenService {
  constructor(private tokenRepository: RefreshTokenRepository) {}

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async create(payload: {
    userId: string;
    token: string;
    deviceId?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const existingToken = await this.findByToken(payload.token);

    if (existingToken) {
      existingToken.lastUsedAt = new Date();
      existingToken.ip = payload.ip;
      existingToken.userAgent = payload.userAgent;
      return await this.tokenRepository.save(existingToken);
    }

    const tokenHash = this.hashToken(payload.token);

    const rt = new RefreshToken();
    rt.tokenHash = tokenHash;
    rt.user = { id: payload.userId } as User;
    rt.deviceId = payload.deviceId;
    rt.ip = payload.ip;
    rt.userAgent = payload.userAgent;
    rt.lastUsedAt = new Date();
    return this.tokenRepository.save(rt);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const tokenHash = this.hashToken(token);
    return this.tokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
  }

  async isTokenExists(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const count = await this.tokenRepository.count({ where: { tokenHash } });
    return count > 0;
  }

  async removeByValue(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.tokenRepository.delete({ tokenHash } as any);
  }

  // flip ban/unban; return updated entity
  async toggleBan(token: string): Promise<RefreshToken | null> {
    const found = await this.findByToken(token);
    if (!found) return null;
    found.isBanned = !found.isBanned;
    return this.tokenRepository.save(found);
  }

  // Optionally update lastUsedAt for auditing
  async touch(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.tokenRepository.update(
      { tokenHash } as any,
      { lastUsedAt: new Date() } as any
    );
  }
}
