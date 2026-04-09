import { Injectable, Logger } from '@nestjs/common';
import { TIER_LABELS } from './engagement.interface';

interface PersonaEngagementFields {
  name: string;
  tone: string[];
  replyStyle?: string | null;
  engagementExamples?: Record<string, { incoming: string; response: string }[]> | null;
  boundaries?: string[];
  escalationPhrases?: string[];
  complaintPlaybook?: string | null;
  proactiveRules?: string | null;
}

@Injectable()
export class EngagementPipeline {
  private readonly logger = new Logger(EngagementPipeline.name);

  constructor(
    private readonly personaService: any,
    private readonly complianceService: any
  ) {}

  /**
   * Check if the incoming text touches a boundary topic.
   * Returns true if the agent should skip (confidence < 40%).
   */
  shouldSkip(
    incomingText: string,
    persona: { boundaries: string[]; escalationPhrases: string[] }
  ): boolean {
    const lower = incomingText.toLowerCase();
    return persona.boundaries.some((b) => lower.includes(b.toLowerCase()));
  }

  /**
   * Check if the incoming text contains escalation phrases.
   * Returns true if the response should always go to the approval queue.
   */
  shouldEscalate(
    incomingText: string,
    persona: { boundaries: string[]; escalationPhrases: string[] }
  ): boolean {
    const lower = incomingText.toLowerCase();
    return persona.escalationPhrases.some((p) => lower.includes(p.toLowerCase()));
  }

  /**
   * Build the system prompt for engagement reply generation.
   * Includes persona voice, reply style, tier-specific guidance, and few-shot examples.
   */
  buildReplySystemPrompt(
    persona: PersonaEngagementFields,
    platform: string,
    tier: number
  ): string {
    const tierLabel = TIER_LABELS[tier] ?? 'conversational';
    const parts: string[] = [];

    parts.push(`You are ${persona.name}, replying to a ${tierLabel} engagement on ${platform}.`);
    parts.push(`Your tone: ${persona.tone.join(', ')}.`);

    if (persona.replyStyle) {
      parts.push(`Reply style: ${persona.replyStyle}`);
    }

    // Tier-specific guidance
    if (tier === 1) {
      parts.push('This is a passive engagement. React with a like or simple emoji. Keep it minimal.');
    } else if (tier === 2) {
      parts.push('This is an acknowledgment. Thank them warmly but briefly. One sentence max.');
    } else if (tier === 3) {
      parts.push('This is a conversational reply. Engage substantively — answer questions, add perspective. Keep it concise but valuable.');
    } else if (tier === 4) {
      parts.push('This is a proactive engagement. You are joining a conversation. Add genuine value — share insight or ask a thoughtful question. Never self-promote.');
      if (persona.proactiveRules) {
        parts.push(`Proactive rules: ${persona.proactiveRules}`);
      }
    } else if (tier === 5) {
      parts.push('This is a sensitive engagement. Handle with care.');
      if (persona.complaintPlaybook) {
        parts.push(`Follow this playbook: ${persona.complaintPlaybook}`);
      }
    }

    // Few-shot examples for this tier
    const examples = persona.engagementExamples?.[tierLabel];
    if (examples && examples.length > 0) {
      parts.push('\nExamples of ideal replies:');
      for (const ex of examples) {
        parts.push(`  User: "${ex.incoming}"`);
        parts.push(`  You: "${ex.response}"`);
      }
    }

    parts.push('\nRules:');
    parts.push('- Reply in the same language as the incoming message.');
    parts.push('- Be authentic, not robotic.');
    parts.push('- Do not use hashtags in replies unless the platform culture expects it.');
    parts.push('- Never disclose that you are an AI unless directly asked.');

    return parts.join('\n');
  }

  /**
   * Run compliance checks on the drafted response.
   */
  async checkCompliance(responseText: string, platform: string) {
    return this.complianceService.checkContent(
      { text: responseText, images: [], videos: [] },
      platform
    );
  }
}
