import { Module } from '@nestjs/common';
import { BodyService } from './body.service';
import { BodyController } from './body.controller';

@Module({ providers: [BodyService], controllers: [BodyController] })
export class BodyModule {}
