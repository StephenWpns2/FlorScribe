import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'Flor Scribe API',
      version: '1.0.0',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
    };
  }
}

