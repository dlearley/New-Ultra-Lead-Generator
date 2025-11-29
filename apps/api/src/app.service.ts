import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string } {
    return {
      message: 'Hello from NestJS API',
    };
  }

  health(): { status: string } {
    return {
      status: 'ok',
    };
  }
}
