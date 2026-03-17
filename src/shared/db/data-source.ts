import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { env } from '@/src/shared/config/env';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  entities: ['src/modules/**/infrastructure/entities/*.entity.ts'],
  migrations: ['migrations/*.ts'],
  synchronize: false,
  logging: env.NODE_ENV === 'development',
});
