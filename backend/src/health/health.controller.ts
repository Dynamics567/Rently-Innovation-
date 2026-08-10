import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '@common/decorators/public.decorator';

/**
 * Unauthenticated liveness/readiness probe for Railway (and any other
 * platform health check). Confirms the process is up AND the database
 * connection is actually usable — a process that's "running" but can't
 * reach Postgres should still fail the check.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async check() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' };
  }
}
