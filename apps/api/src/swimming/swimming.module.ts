import { Module } from '@nestjs/common';
import { SwimmingService } from './swimming.service';
import { SwimmingController } from './swimming.controller';

@Module({ providers: [SwimmingService], controllers: [SwimmingController] })
export class SwimmingModule {}
