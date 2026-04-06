'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@mav/frontend/components/new-launch/providers/high.order.provider';
import { Input } from '@mav/react/form/input';
import { useSettings } from '@mav/frontend/components/launches/helpers/use.values';
import { WordpressPostType } from '@mav/frontend/components/new-launch/providers/wordpress/wordpress.post.type';
import { MediaComponent } from '@mav/frontend/components/media/media.component';
import { WordpressDto } from '@mav/nestjs-libraries/dtos/posts/providers-settings/wordpress.dto';

const WordpressSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <WordpressPostType {...form.register('type')} />
      <MediaComponent
        label="Cover picture"
        description="Add a cover picture"
        {...form.register('main_image')}
      />
    </>
  );
};
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: WordpressSettings,
  CustomPreviewComponent: undefined, // WordpressPreview,
  dto: WordpressDto,
  checkValidity: undefined,
  maximumCharacters: 100000,
});
