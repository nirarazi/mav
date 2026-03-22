import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaRepository } from '@maverick/nestjs-libraries/database/prisma/prisma.service';
import { Persona } from '@prisma/client';
import {
  PersonaCreateInput,
  PersonaUpdateInput,
  PersonaVoice,
  WritingStyle,
  ExamplePost,
  ResponseRules,
  PlatformOverride,
  ResolvedVoice,
} from './persona.interface';

@Injectable()
export class PersonaService {
  constructor(private _persona: PrismaRepository<'persona'>) {}

  async create(orgId: string, data: PersonaCreateInput): Promise<Persona> {
    return this._persona.model.persona.create({
      data: {
        organizationId: orgId,
        name: data.name,
        role: data.role,
        bio: data.bio,
        tone: data.tone ?? [],
        preferredWords: data.preferredWords ?? [],
        forbiddenWords: data.forbiddenWords ?? [],
        writingStyle: (data.writingStyle as any) ?? undefined,
        topics: data.topics ?? [],
        examplePosts: (data.examplePosts as any) ?? undefined,
        responseRules: (data.responseRules as any) ?? undefined,
        platformOverrides: (data.platformOverrides as any) ?? undefined,
      },
    });
  }

  async findAll(orgId: string): Promise<Persona[]> {
    return this._persona.model.persona.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Persona> {
    const persona = await this._persona.model.persona.findUnique({
      where: { id },
    });

    if (!persona) {
      throw new NotFoundException(`Persona with id ${id} not found`);
    }

    return persona;
  }

  async update(id: string, data: PersonaUpdateInput): Promise<Persona> {
    await this.findById(id);

    return this._persona.model.persona.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.tone !== undefined && { tone: data.tone }),
        ...(data.preferredWords !== undefined && {
          preferredWords: data.preferredWords,
        }),
        ...(data.forbiddenWords !== undefined && {
          forbiddenWords: data.forbiddenWords,
        }),
        ...(data.writingStyle !== undefined && {
          writingStyle: data.writingStyle as any,
        }),
        ...(data.topics !== undefined && { topics: data.topics }),
        ...(data.examplePosts !== undefined && {
          examplePosts: data.examplePosts as any,
        }),
        ...(data.responseRules !== undefined && {
          responseRules: data.responseRules as any,
        }),
        ...(data.platformOverrides !== undefined && {
          platformOverrides: data.platformOverrides as any,
        }),
      },
    });
  }

  async delete(id: string): Promise<Persona> {
    await this.findById(id);

    return this._persona.model.persona.delete({
      where: { id },
    });
  }

  async getActive(orgId: string): Promise<Persona | null> {
    return this._persona.model.persona.findFirst({
      where: {
        organizationId: orgId,
        isActive: true,
      },
    });
  }

  async setActive(orgId: string, personaId: string): Promise<Persona> {
    await this.findById(personaId);

    await this._persona.model.persona.updateMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
      data: { isActive: false },
    });

    return this._persona.model.persona.update({
      where: { id: personaId },
      data: { isActive: true },
    });
  }

  buildSystemPrompt(persona: Persona, platform?: string): string {
    const voice = this.resolveVoice(persona, platform);
    const style = voice.writingStyle;
    const rules = voice.responseRules;

    const sections: string[] = [];

    sections.push(
      `You are "${persona.name}"${persona.role ? `, a ${persona.role}` : ''}.`
    );

    if (persona.bio) {
      sections.push(`Background: ${persona.bio}`);
    }

    if (platform) {
      sections.push(`You are writing content for ${platform}.`);
    }

    // Voice and tone
    if (voice.tone.length > 0) {
      sections.push(
        `Your voice is ${voice.tone.join(', ')}. Every piece of content must reflect this tone consistently.`
      );
    }

    // Writing style constraints
    const styleDirectives: string[] = [];

    if (style) {
      switch (style.sentenceLength) {
        case 'short':
          styleDirectives.push(
            'Keep sentences short and punchy. Aim for under 15 words per sentence.'
          );
          break;
        case 'medium':
          styleDirectives.push(
            'Use sentences of moderate length, around 15-25 words.'
          );
          break;
        case 'long':
          styleDirectives.push(
            'You may use longer, more detailed sentences when it serves the point.'
          );
          break;
        case 'mixed':
          styleDirectives.push(
            'Vary sentence length for rhythm. Mix short punchy statements with longer explanatory ones.'
          );
          break;
      }

      switch (style.formality) {
        case 'casual':
          styleDirectives.push(
            'Write casually, as if talking to a friend. Contractions and colloquial language are encouraged.'
          );
          break;
        case 'neutral':
          styleDirectives.push(
            'Maintain a balanced tone. Neither overly formal nor too casual.'
          );
          break;
        case 'formal':
          styleDirectives.push(
            'Write in a formal register. Avoid slang and contractions.'
          );
          break;
        case 'professional':
          styleDirectives.push(
            'Use professional language suitable for industry audiences. Clear, precise, and authoritative.'
          );
          break;
      }

      switch (style.emojiUsage) {
        case 'none':
          styleDirectives.push('Do not use any emojis.');
          break;
        case 'minimal':
          styleDirectives.push(
            'Use emojis sparingly, at most one per post, and only when it adds meaning.'
          );
          break;
        case 'moderate':
          styleDirectives.push(
            'Use emojis to add personality, but do not overdo it. Two to three per post is fine.'
          );
          break;
        case 'heavy':
          styleDirectives.push(
            'Use emojis liberally to express energy and emotion throughout the content.'
          );
          break;
      }

      switch (style.hashtagStyle) {
        case 'none':
          styleDirectives.push('Do not include hashtags.');
          break;
        case 'minimal':
          styleDirectives.push(
            'Use one to two relevant hashtags at the end of the post.'
          );
          break;
        case 'trending':
          styleDirectives.push(
            'Include trending and relevant hashtags to maximize discoverability.'
          );
          break;
        case 'branded':
          styleDirectives.push(
            'Include branded hashtags specific to this account or campaign.'
          );
          break;
      }
    }

    if (styleDirectives.length > 0) {
      sections.push(`Writing style:\n${styleDirectives.join('\n')}`);
    }

    // Vocabulary
    if (voice.preferredWords.length > 0) {
      sections.push(
        `Preferred vocabulary (weave these in naturally): ${voice.preferredWords.join(', ')}`
      );
    }

    if (voice.forbiddenWords.length > 0) {
      sections.push(
        `Never use these words or phrases: ${voice.forbiddenWords.join(', ')}`
      );
    }

    // Topics
    if (voice.topics.length > 0) {
      sections.push(
        `Areas of expertise and focus topics: ${voice.topics.join(', ')}`
      );
    }

    // Response rules
    if (rules) {
      const ruleLines: string[] = [];

      if (rules.ignoreTopics && rules.ignoreTopics.length > 0) {
        ruleLines.push(
          `Never engage with or mention these topics: ${rules.ignoreTopics.join(', ')}`
        );
      }

      if (rules.maxPostsPerDay && rules.maxPostsPerDay > 0) {
        ruleLines.push(
          `Limit output to a maximum of ${rules.maxPostsPerDay} posts per day.`
        );
      }

      if (rules.escalateTo) {
        ruleLines.push(
          `If unsure or if the topic is sensitive, escalate to: ${rules.escalateTo}`
        );
      }

      if (ruleLines.length > 0) {
        sections.push(`Content rules:\n${ruleLines.join('\n')}`);
      }
    }

    return sections.join('\n\n');
  }

  buildFewShotExamples(
    persona: Persona,
    platform?: string
  ): ExamplePost[] {
    const allExamples = (persona.examplePosts as unknown as ExamplePost[]) ?? [];

    if (!platform) {
      return allExamples;
    }

    const platformExamples = allExamples.filter(
      (ex) => ex.platform.toLowerCase() === platform.toLowerCase()
    );

    if (platformExamples.length > 0) {
      return platformExamples;
    }

    // Fall back to examples without a platform tag, or all examples if none match
    const genericExamples = allExamples.filter((ex) => !ex.platform);
    return genericExamples.length > 0 ? genericExamples : allExamples;
  }

  private resolveVoice(persona: Persona, platform?: string): ResolvedVoice {
    const baseStyle = (persona.writingStyle as unknown as WritingStyle) ?? {
      sentenceLength: 'mixed',
      formality: 'neutral',
      emojiUsage: 'minimal',
      hashtagStyle: 'minimal',
    };

    const baseRules = (persona.responseRules as unknown as ResponseRules) ?? {
      replyTo: [],
      ignoreTopics: [],
      maxPostsPerDay: 0,
    };

    const base: ResolvedVoice = {
      tone: persona.tone ?? [],
      preferredWords: persona.preferredWords ?? [],
      forbiddenWords: persona.forbiddenWords ?? [],
      writingStyle: baseStyle,
      topics: persona.topics ?? [],
      responseRules: baseRules,
    };

    if (!platform) {
      return base;
    }

    const overrides =
      (persona.platformOverrides as unknown as Record<string, PlatformOverride>) ??
      {};
    const override = overrides[platform.toLowerCase()];

    if (!override) {
      return base;
    }

    return {
      tone: override.tone ?? base.tone,
      preferredWords: override.preferredWords ?? base.preferredWords,
      forbiddenWords: override.forbiddenWords ?? base.forbiddenWords,
      writingStyle: {
        ...base.writingStyle,
        ...(override.writingStyle ?? {}),
      },
      topics: override.topics ?? base.topics,
      responseRules: {
        ...base.responseRules,
        ...(override.responseRules ?? {}),
      },
    };
  }
}
