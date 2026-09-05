import net from 'node:net';
import { env } from '../config/env.js';

export type DependencyStatus = 'up' | 'down';

export interface DetailedHealth {
  status: 'healthy' | 'degraded';
  services: { api: 'up'; database: DependencyStatus; redis: DependencyStatus; mlService: DependencyStatus };
}

async function checkTcp(url: string): Promise<DependencyStatus> {
  const target = new URL(url);
  const port = Number(target.port || (target.protocol === 'redis:' ? 6379 : 5432));
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host: target.hostname, port });
      const timeout = setTimeout(() => { socket.destroy(); reject(new Error('Dependency probe timed out')); }, 1500);
      socket.once('connect', () => { clearTimeout(timeout); socket.end(); resolve(); });
      socket.once('error', (error) => { clearTimeout(timeout); socket.destroy(); reject(error); });
    });
    return 'up';
  } catch {
    return 'down';
  }
}

async function checkHttp(url: string): Promise<DependencyStatus> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

export class DependencyHealthService {
  async getDetailedHealth(): Promise<DetailedHealth> {
    const [database, redis, mlService] = await Promise.all([
      env.databaseUrl ? checkTcp(env.databaseUrl) : Promise.resolve<DependencyStatus>('down'),
      env.redisUrl ? checkTcp(env.redisUrl) : Promise.resolve<DependencyStatus>('down'),
      checkHttp(`${env.mlServiceUrl}/health`),
    ]);
    const services = { api: 'up' as const, database, redis, mlService };
    return { status: Object.values(services).every((status) => status === 'up') ? 'healthy' : 'degraded', services };
  }
}
