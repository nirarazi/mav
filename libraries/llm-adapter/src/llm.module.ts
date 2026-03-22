import { Global, Module } from '@nestjs/common';
import { LlmService } from './llm.service';

@Global()
@Module({
  providers: [LlmService],
  get exports() {
    return this.providers;
  },
})
export class LlmModule {}
