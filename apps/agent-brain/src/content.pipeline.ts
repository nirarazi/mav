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

// Platform character limits for user prompt construction
const PLATFORM_LIMITS: Record<string, { maxChars: number; format: string }> = {
  x: { maxChars: 280, format: 'a concise tweet' },
  linkedin: { maxChars: 3000, format: 'a professional LinkedIn post' },
  bluesky: { maxChars: 300, format: 'a short Bluesky post' },
  threads: { maxChars: 500, format: 'a Threads post' },
  mastodon: { maxChars: 500, format: 'a Mastodon toot' },
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

    // 5. Run compliance check
    const complianceResult = await this.complianceService.checkContent(
      { text: llmResult.text },
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

    // 6. Add bot label if required
    const labeledContent = this.complianceService.addBotLabel(
      llmResult.text,
      request.platform,
    );

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
    };

    return [
      `Write ${platformInfo.format} for ${platform} about the following topic:`,
      ``,
      `Topic: ${topic}`,
      ``,
      `Constraints:`,
      `- Maximum ${platformInfo.maxChars} characters`,
      `- Write in first person`,
      `- Be authentic and opinionated`,
      `- Do not include hashtags unless the platform specifically uses them`,
      `- Do not include any meta-commentary about the post itself`,
      `- Output ONLY the post content, nothing else`,
    ].join('\n');
  }
}
