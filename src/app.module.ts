import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';

import { TodosModule } from './modules/todos/todos.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        MONGODB_URI: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
        redact: ['req.headers.cookie', 'req.headers.authorization'],
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:HH:MM:ss',
                  ignore: 'pid,hostname',
                  messageFormat: '[{context}] {msg}',
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        connectionFactory: (connection) => {
          connection.on('open', () => console.log('MongoDB connected'));
          if (process.env.NODE_ENV !== 'production') {
            connection.set(
              'debug',
              (collectionName: string, method: string, query: any) => {
                console.log(
                  `MongoDB: ${collectionName}.${method}`,
                  JSON.stringify(query),
                );
              },
            );
          }
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: redisStore,
        url: configService.get<string>('REDIS_URL'),
        ttl: 60 * 1000, // 60 seconds
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),
    // TODO: Instead of ip based throttling (defaults to ip based), we'll have user based (once we have auth)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute window
        limit: 100, // 100 requests per window per IP
      },
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    NotificationsModule,
    TodosModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
