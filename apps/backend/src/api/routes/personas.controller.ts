import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@mav/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PersonaService } from '@mav/persona-engine/persona.service';
import { PersonaCreateInput, PersonaUpdateInput } from '@mav/persona-engine/persona.interface';

@ApiTags('Personas')
@Controller('/personas')
export class PersonasController {
  constructor(private readonly personaService: PersonaService) {}

  @Get('/')
  async list(@GetOrgFromRequest() org: Organization) {
    return this.personaService.findAll(org.id);
  }

  @Get('/active')
  async getActive(@GetOrgFromRequest() org: Organization) {
    const persona = await this.personaService.getActive(org.id);
    return { persona };
  }

  @Get('/:id')
  async getById(@Param('id') id: string) {
    return this.personaService.findById(id);
  }

  @Post('/')
  async create(
    @GetOrgFromRequest() org: Organization,
    @Body() body: PersonaCreateInput,
  ) {
    return this.personaService.create(org.id, body);
  }

  @Put('/:id')
  async update(
    @Param('id') id: string,
    @Body() body: PersonaUpdateInput,
  ) {
    return this.personaService.update(id, body);
  }

  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return this.personaService.delete(id);
  }

  @Post('/:id/activate')
  async activate(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this.personaService.setActive(org.id, id);
  }
}
