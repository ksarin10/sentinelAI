import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { UsersService } from "../users/users.service";
import { LoginDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("Email is already registered");
    }
    const user = await this.users.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      passwordHash: await hash(dto.password, 12)
    });
    return this.issueToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email.toLowerCase());
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.issueToken(user.id, user.email);
  }

  private issueToken(id: string, email: string) {
    return {
      accessToken: this.jwt.sign({ sub: id, email }),
      user: { id, email }
    };
  }
}
