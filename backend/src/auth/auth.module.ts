import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../config/app-config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthCookies } from './cookie-names';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionService,
    TokenService,
    { provide: AuthCookies, useFactory: (config: AppConfig) => new AuthCookies(config), inject: [AppConfig] },
  ],
  exports: [PasswordService, SessionService, TokenService, AuthCookies],
})
export class AuthModule {}
