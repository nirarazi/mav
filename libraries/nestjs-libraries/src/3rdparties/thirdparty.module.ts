import { Global, Module } from '@nestjs/common';
import { HeygenProvider } from '@mav/nestjs-libraries/3rdparties/heygen/heygen.provider';
import { ThirdPartyManager } from '@mav/nestjs-libraries/3rdparties/thirdparty.manager';

@Global()
@Module({
  providers: [HeygenProvider, ThirdPartyManager],
  get exports() {
    return this.providers;
  },
})
export class ThirdPartyModule {}
