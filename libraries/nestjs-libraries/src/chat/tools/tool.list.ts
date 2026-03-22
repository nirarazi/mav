import { IntegrationValidationTool } from '@maverick/nestjs-libraries/chat/tools/integration.validation.tool';
import { IntegrationTriggerTool } from '@maverick/nestjs-libraries/chat/tools/integration.trigger.tool';
import { IntegrationSchedulePostTool } from './integration.schedule.post';
import { GenerateVideoOptionsTool } from '@maverick/nestjs-libraries/chat/tools/generate.video.options.tool';
import { VideoFunctionTool } from '@maverick/nestjs-libraries/chat/tools/video.function.tool';
import { GenerateVideoTool } from '@maverick/nestjs-libraries/chat/tools/generate.video.tool';
import { GenerateImageTool } from '@maverick/nestjs-libraries/chat/tools/generate.image.tool';
import { IntegrationListTool } from '@maverick/nestjs-libraries/chat/tools/integration.list.tool';

export const toolList = [
  IntegrationListTool,
  IntegrationValidationTool,
  IntegrationTriggerTool,
  IntegrationSchedulePostTool,
  GenerateVideoOptionsTool,
  VideoFunctionTool,
  GenerateVideoTool,
  GenerateImageTool,
];
