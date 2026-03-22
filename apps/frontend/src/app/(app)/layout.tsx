import { SentryComponent } from '@maverick/frontend/components/layout/sentry.component';

export const dynamic = 'force-dynamic';
import '../global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import '@copilotkit/react-ui/styles.css';
import LayoutContext from '@maverick/frontend/components/layout/layout.context';
import { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import PlausibleProvider from 'next-plausible';
import clsx from 'clsx';
import { VariableContextComponent } from '@maverick/react/helpers/variable.context';
import { Fragment } from 'react';
import { PHProvider } from '@maverick/react/helpers/posthog';
import UtmSaver from '@maverick/helpers/utils/utm.saver';
import { DubAnalytics } from '@maverick/frontend/components/layout/dubAnalytics';
import { FacebookComponent } from '@maverick/frontend/components/layout/facebook.component';
import { headers } from 'next/headers';
import { headerName } from '@maverick/react/translation/i18n.config';
import { HtmlComponent } from '@maverick/frontend/components/layout/html.component';
import Script from 'next/script';
// import dynamicLoad from 'next/dynamic';
// const SetTimezone = dynamicLoad(
//   () => import('@maverick/frontend/components/layout/set.timezone'),
//   {
//     ssr: false,
//   }
// );

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['600', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export default async function AppLayout({ children }: { children: ReactNode }) {
  const allHeaders = headers();
  const Plausible = !!process.env.STRIPE_PUBLISHABLE_KEY
    ? PlausibleProvider
    : Fragment;
  return (
    <html>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {!!process.env.DATAFAST_WEBSITE_ID && (
          <Script
            data-website-id={process.env.DATAFAST_WEBSITE_ID}
            data-domain="maverick.com"
            src="https://datafa.st/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body
        className={clsx(jakartaSans.className, 'dark text-primary !bg-primary')}
      >
        <VariableContextComponent
          storageProvider={
            process.env.STORAGE_PROVIDER! as 'local' | 'cloudflare'
          }
          environment={process.env.NODE_ENV!}
          backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL!}
          plontoKey={process.env.NEXT_PUBLIC_POLOTNO!}
          stripeClient={process.env.STRIPE_PUBLISHABLE_KEY!}
          billingEnabled={!!process.env.STRIPE_PUBLISHABLE_KEY}
          discordUrl={process.env.NEXT_PUBLIC_DISCORD_SUPPORT!}
          frontEndUrl={process.env.FRONTEND_URL!}
          isGeneral={!!process.env.IS_GENERAL}
          genericOauth={!!process.env.MAVERICK_GENERIC_OAUTH}
          oauthLogoUrl={process.env.NEXT_PUBLIC_MAVERICK_OAUTH_LOGO_URL!}
          oauthDisplayName={process.env.NEXT_PUBLIC_MAVERICK_OAUTH_DISPLAY_NAME!}
          uploadDirectory={process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY!}
          mcpUrl={process.env.MCP_URL}
          dub={!!process.env.STRIPE_PUBLISHABLE_KEY}
          facebookPixel={process.env.NEXT_PUBLIC_FACEBOOK_PIXEL!}
          telegramBotName={process.env.TELEGRAM_BOT_NAME!}
          neynarClientId={process.env.NEYNAR_CLIENT_ID!}
          isSecured={!process.env.NOT_SECURED}
          disableImageCompression={!!process.env.DISABLE_IMAGE_COMPRESSION}
          disableXAnalytics={!!process.env.DISABLE_X_ANALYTICS}
          sentryDsn={process.env.NEXT_PUBLIC_SENTRY_DSN!}
          extensionId={process.env.EXTENSION_ID || ''}
          language={allHeaders.get(headerName)}
          transloadit={
            process.env.TRANSLOADIT_AUTH && process.env.TRANSLOADIT_TEMPLATE
              ? [
                  process.env.TRANSLOADIT_AUTH!,
                  process.env.TRANSLOADIT_TEMPLATE!,
                ]
              : []
          }
        >
          <SentryComponent>
            {/*<SetTimezone />*/}
            <HtmlComponent />
            <DubAnalytics />
            <FacebookComponent />
            <Plausible
              domain={!!process.env.IS_GENERAL ? 'maverick.com' : 'gitroom.com'}
            >
              <PHProvider
                phkey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
                host={process.env.NEXT_PUBLIC_POSTHOG_HOST}
              >
                <LayoutContext>
                  <UtmSaver />
                  {children}
                </LayoutContext>
              </PHProvider>
            </Plausible>
          </SentryComponent>
        </VariableContextComponent>
      </body>
    </html>
  );
}
