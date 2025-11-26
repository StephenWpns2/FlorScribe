import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<Omit<User, 'hashedPassword'>> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      email: registerDto.email,
      name: registerDto.name,
      hashedPassword,
      isActive: true,
      isVerified: false,
    });

    const { hashedPassword: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
  }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.hashedPassword,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    const payload = { sub: user.id };
    const accessToken = this.createAccessToken(payload);
    const refreshToken = this.createRefreshToken(payload);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
    };
  }

  async refresh(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
  }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { sub: payload.sub };
      const accessToken = this.createAccessToken(newPayload);
      const newRefreshToken = this.createRefreshToken(newPayload);

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        token_type: 'bearer',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.usersService.findById(userId);
  }

  private createAccessToken(payload: { sub: number }): string {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '30m';
    return this.jwtService.sign(
      { ...payload, type: 'access' },
      {
        secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
        expiresIn,
      },
    );
  }

  private createRefreshToken(payload: { sub: number }): string {
    const expiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    return this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
        expiresIn,
      },
    );
  }
}

