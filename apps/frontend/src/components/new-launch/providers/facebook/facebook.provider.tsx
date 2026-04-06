'use client';

import {
  PostComment,
  withProvider,
} from '@mav/frontend/components/new-launch/providers/high.order.provider';
import { FacebookDto } from '@mav/nestjs-libraries/dtos/posts/providers-settings/facebook.dto';
import { Input } from '@mav/react/form/input';
import { useSettings } from '@mav/frontend/components/launches/helpers/use.values';
import { FacebookPreview } from '@mav/frontend/components/new-launch/providers/facebook/facebook.preview';

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
