import { Global, Module } from '@nestjs/common';
import { PersonaService } from './persona.service';

@Global()
@Module({
  providers: [PersonaService],
  get exports() {
    return this.providers;
  },
})
export class PersonaModule {}
