'use client';

import {
  PostComment,
  withProvider,
} from '@mav/frontend/components/new-launch/providers/high.order.provider';
import { ListmonkDto } from '@mav/nestjs-libraries/dtos/posts/providers-settings/listmonk.dto';
import { Input } from '@mav/react/form/input';
import { useSettings } from '@mav/frontend/components/launches/helpers/use.values';
import { SelectList } from '@mav/frontend/components/new-launch/providers/listmonk/select.list';
import { SelectTemplates } from '@mav/frontend/components/new-launch/providers/listmonk/select.templates';

const SettingsComponent = () => {
  const form = useSettings();

  return (
    <>
      <Input label="Subject" {...form.register('subject')} />
      <Input label="Preview" {...form.register('preview')} />
      <SelectList {...form.register('list')} />
      <SelectTemplates {...form.register('template')} />
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SettingsComponent,
  CustomPreviewComponent: undefined,
  dto: ListmonkDto,
  checkValidity: undefined,
  maximumCharacters: 300000,
});
