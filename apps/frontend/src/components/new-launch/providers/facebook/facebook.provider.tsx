'use client';

import {
  PostComment,
  withProvider,
} from '@maverick/frontend/components/new-launch/providers/high.order.provider';
import { FacebookDto } from '@maverick/nestjs-libraries/dtos/posts/providers-settings/facebook.dto';
import { Input } from '@maverick/react/form/input';
import { useSettings } from '@maverick/frontend/components/launches/helpers/use.values';
import { FacebookPreview } from '@maverick/frontend/components/new-launch/providers/facebook/facebook.preview';

export const FacebookSettings = () => {
  const { register } = useSettings();

  return (
    <Input
      label={
        'Embedded URL (only for text Post)'
      }
      {...register('url')}
    />
  );
};

export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: FacebookSettings,
  CustomPreviewComponent: FacebookPreview,
  dto: FacebookDto,
  checkValidity: undefined,
  maximumCharacters: 63206,
});
