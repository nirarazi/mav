export interface WritingStyle {
  sentenceLength: 'short' | 'medium' | 'long' | 'mixed';
  formality: 'casual' | 'neutral' | 'formal' | 'professional';
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
  hashtagStyle: 'none' | 'minimal' | 'trending' | 'branded';
}

export interface ExamplePost {
  platform: string;
  content: string;
  context?: string;
}

export interface ResponseRules {
  replyTo: string[];
  ignoreTopics: string[];
  escalateTo?: string;
  maxPostsPerDay: number;
}

export interface PlatformOverride {
  tone?: string[];
  preferredWords?: string[];
  forbiddenWords?: string[];
  writingStyle?: Partial<WritingStyle>;
  topics?: string[];
  responseRules?: Partial<ResponseRules>;
}

export interface PersonaVoice {
  name: string;
  role?: string;
  bio?: string;
  tone: string[];
  preferredWords: string[];
  forbiddenWords: string[];
  writingStyle: WritingStyle;
  topics: string[];
  examplePosts: ExamplePost[];
  responseRules: ResponseRules;
  platformOverrides: Record<string, PlatformOverride>;
}

export interface PersonaCreateInput {
  name: string;
  role?: string;
  bio?: string;
  tone?: string[];
  preferredWords?: string[];
  forbiddenWords?: string[];
  writingStyle?: WritingStyle;
  topics?: string[];
  examplePosts?: ExamplePost[];
  responseRules?: ResponseRules;
  platformOverrides?: Record<string, PlatformOverride>;
}

export interface PersonaUpdateInput extends Partial<PersonaCreateInput> {}

export interface ResolvedVoice {
  tone: string[];
  preferredWords: string[];
  forbiddenWords: string[];
  writingStyle: WritingStyle;
  topics: string[];
  responseRules: ResponseRules;
}
