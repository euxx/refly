import { Module } from '@nestjs/common';
import { CollabGateway } from './collab.gateway';
import { CommonModule } from '@/common/common.module';
import { RAGModule } from '@/rag/rag.module';
import { MiscModule } from '@/misc/misc.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { CollabService } from './collab.service';
import { CollabController } from './collab.controller';

@Module({
  imports: [CommonModule, RAGModule, MiscModule, SubscriptionModule],
  providers: [CollabGateway, CollabService],
  exports: [CollabService],
  controllers: [CollabController],
})
export class CollabModule {}
