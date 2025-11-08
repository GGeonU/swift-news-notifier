import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SummaryModule } from './summary/summary.module';
import { FetcherModule } from './fetcher/fetcher.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SummaryModule,
    FetcherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
