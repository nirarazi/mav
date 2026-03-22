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
import { GetOrgFromRequest } from '@maverick/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PersonaService } from '@maverick/persona-engine/persona.service';
import { PersonaCreateInput, PersonaUpdateInput } from '@maverick/persona-engine/persona.interface';

@ApiTags('Personas')
@Controller('/public/v1/personas')
export class PublicPersonasController {
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
  async getById(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
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
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: PersonaUpdateInput,
  ) {
    return this.personaService.update(id, body);
  }

  @Delete('/:id')
  async delete(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this.personaService.delete(id);
  }

  @Post('/:id/activate')
  async activate(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this.personaService.setActive(org.id, id);
  }

  @Get('/:id/prompt')
  async getPrompt(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('platform') platform?: string,
  ) {
    const persona = await this.personaService.findById(id);
    const systemPrompt = this.personaService.buildSystemPrompt(persona, platform);
    const examples = this.personaService.buildFewShotExamples(persona, platform);
    return { systemPrompt, examples };
  }
}
