import { TrackEnum } from '@maverick/nestjs-libraries/user/track.enum';
import { useUser } from '@maverick/frontend/components/layout/user.context';
import { useFetch } from '@maverick/helpers/utils/custom.fetch';
import { useCallback } from 'react';
import { useVariables } from '@maverick/react/helpers/variable.context';
export const useTrack = () => {
  const user = useUser();
  const fetch = useFetch();
  const { facebookPixel } = useVariables();
  return useCallback(
    async (track: TrackEnum, additional?: Record<string, any>) => {
      if (!facebookPixel) {
        return;
      }
      try {
        const { track: uq } = await (
          await fetch(user ? `/user/t` : `/public/t`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tt: track,
              ...(additional
                ? {
                    additional,
                  }
                : {}),
            }),
          })
        ).json();
        if (window.fbq) {
          // @ts-ignore
          window.fbq('track', TrackEnum[track], additional, {
            eventID: uq,
          });
        }
      } catch (e) {
        console.log(e);
      }
    },
    [user]
  );
};
