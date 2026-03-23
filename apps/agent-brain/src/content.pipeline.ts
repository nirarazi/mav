/**
 * Content Pipeline — the core autonomous posting flow.
 *
 * Flow: persona → LLM → compliance → bot label → approval queue
 *
 * This is a plain class (not NestJS injectable) to keep it testable
 * without DI framework overhead. The brain.service.ts will inject deps.
 */

export interface ContentRequest {
  orgId: string;
  platform: string;
  topic: string;
  personaId?: string;
  agentSessionId?: string;
}

export interface ContentResult {
  content: string;
  platform: string;
  personaId: string;
  complianceResult: {
    allowed: boolean;
    riskScore: number;
    checks: any[];
    contentHash: string;
  };
  approvalItem: {
    id: string;
    status: string;
  };
  llmUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedCost: number;
}

// Platform-specific content guidance
const PLATFORM_LIMITS: Record<string, {
  maxChars: number;
  format: string;
  hashtagGuidance: string;
}> = {
  x: {
    maxChars: 280,
    format: 'a concise tweet',
    hashtagGuidance: 'Use 1-2 hashtags maximum, only if highly relevant. Hashtags on X should feel natural, not forced. Place them inline within the text or at the very end. Never use more than 2 — it looks spammy.',
  },
  linkedin: {
    maxChars: 3000,
    format: 'a professional LinkedIn post',
    hashtagGuidance: 'Include 3-5 relevant hashtags at the END of the post (after a line break). LinkedIn hashtags drive discovery — use a mix of broad (#AI, #Marketing) and niche (#AIAgents, #SocialMediaAutomation) tags. Always lowercase. Never embed hashtags mid-sentence.',
  },
  bluesky: {
    maxChars: 300,
    format: 'a short Bluesky post',
    hashtagGuidance: 'Do NOT use hashtags. Bluesky culture actively discourages hashtags — posts with them look out of place. Rely on good writing and the algorithm instead.',
  },
  threads: {
    maxChars: 500,
    format: 'a Threads post',
    hashtagGuidance: 'Use 0-2 hashtags, only if they add genuine context. Threads is conversational — heavy hashtag use feels inauthentic. If you use one, place it naturally at the end.',
  },
  mastodon: {
    maxChars: 500,
    format: 'a Mastodon toot',
    hashtagGuidance: 'Use 2-4 hashtags. Mastodon relies heavily on hashtags for content discovery (there is no algorithm). Place them at the end of the post. Use CamelCase for accessibility (#AiAgents not #aiagents). Hashtags are essential on Mastodon — do not skip them.',
  },
};

export class ContentPipeline {
  constructor(
    private personaService: any,
    private llmService: any,
    private complianceService: any,
    private approvalService: any,
    private auditService: any,
  ) {}

  async generatePost(request: ContentRequest): Promise<ContentResult> {
    // 1. Resolve persona
    const persona = request.personaId
      ? await this.personaService.findById(request.personaId)
      : await this.personaService.getActive(request.orgId);

    if (!persona) {
      throw new Error('No active persona found. Create and activate a persona first.');
    }

    // 2. Check rate limit
    const withinRateLimit = await this.complianceService.checkRateLimit(
      request.orgId,
      request.platform,
    );
    if (!withinRateLimit) {
      throw new Error(
        `Rate limit exceeded for ${request.platform}. Try again later.`,
      );
    }

    // 3. Build prompts
    const systemPrompt = this.personaService.buildSystemPrompt(persona, request.platform);
    const fewShotExamples = this.personaService.buildFewShotExamples(persona, request.platform);
    const userMessage = this.buildPlatformPrompt(request.platform, request.topic);

    // 4. Generate content via LLM
    const llmResult = await this.llmService.generateContent({
      systemPrompt,
      userMessage,
      examples: fewShotExamples.map((ex: any) => ({
        role: 'assistant' as const,
        content: ex.content,
      })),
      temperature: 0.8,
      maxTokens: 1000,
    });

    // 5. Add bot label BEFORE compliance check (so the check sees the final content)
    const labeledContent = this.complianceService.addBotLabel(
      llmResult.text,
      request.platform,
    );

    // 6. Run compliance check on the labeled content
    const complianceResult = await this.complianceService.checkContent(
      { text: labeledContent },
      request.platform,
      persona.id,
    );

    if (!complianceResult.allowed) {
      const failedChecks = complianceResult.checks
        .filter((c: any) => !c.passed)
        .map((c: any) => c.message)
        .join('; ');

      // Log the failure
      await this.auditService.log(request.orgId, 'POST_COMPLIANCE_FAILED', {
        platform: request.platform,
        personaId: persona.id,
        failedChecks,
        riskScore: complianceResult.riskScore,
        agentSessionId: request.agentSessionId,
      });

      throw new Error(`Compliance check failed: ${failedChecks}`);
    }

    // 7. Submit to approval queue
    const approvalItem = await this.approvalService.submit(
      request.orgId,
      'POST',
      {
        platform: request.platform,
        content: labeledContent,
        topic: request.topic,
        personaId: persona.id,
        contentHash: complianceResult.contentHash,
      },
      complianceResult.riskScore,
      persona.id,
      request.agentSessionId,
    );

    // 8. Log to audit trail
    await this.auditService.log(request.orgId, 'POST_GENERATED', {
      platform: request.platform,
      personaId: persona.id,
      approvalItemId: approvalItem.id,
      riskScore: complianceResult.riskScore,
      contentHash: complianceResult.contentHash,
      llmUsage: llmResult.usage,
      estimatedCost: llmResult.estimatedCost,
      agentSessionId: request.agentSessionId,
    });

    return {
      content: labeledContent,
      platform: request.platform,
      personaId: persona.id,
      complianceResult: {
        allowed: complianceResult.allowed,
        riskScore: complianceResult.riskScore,
        checks: complianceResult.checks,
        contentHash: complianceResult.contentHash,
      },
      approvalItem: {
        id: approvalItem.id,
        status: approvalItem.status,
      },
      llmUsage: llmResult.usage,
      estimatedCost: llmResult.estimatedCost,
    };
  }

  /**
   * Build a platform-specific prompt that guides the LLM to produce
   * content matching the platform's constraints and style.
   */
  buildPlatformPrompt(platform: string, topic: string): string {
    const platformInfo = PLATFORM_LIMITS[platform.toLowerCase()] ?? {
      maxChars: 500,
      format: 'a social media post',
      hashtagGuidance: 'Use hashtags sparingly and only if relevant to the platform.',
    };

    return [
      `Write ${platformInfo.format} about the following topic:`,
      ``,
      `Topic: ${topic}`,
      ``,
      `Platform constraints:`,
      `- Maximum ${platformInfo.maxChars} characters (including hashtags)`,
      `- Write in first person`,
      `- Be authentic and opinionated — no corporate speak`,
      `- Do not include any meta-commentary about the post itself`,
      ``,
      `Hashtag rules for ${platform}:`,
      platformInfo.hashtagGuidance,
      ``,
      `Output ONLY the post content, nothing else. No quotes, no "Here's a post:", no preamble.`,
    ].join('\n');
  }
}
