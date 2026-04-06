'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@mav/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@mav/react/form/button';
import { Input } from '@mav/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginUserDto } from '@mav/nestjs-libraries/dtos/auth/login.user.dto';
import { GithubProvider } from '@mav/frontend/components/auth/providers/github.provider';
import { OauthProvider } from '@mav/frontend/components/auth/providers/oauth.provider';
import { GoogleProvider } from '@mav/frontend/components/auth/providers/google.provider';
import { useVariables } from '@mav/react/helpers/variable.context';
import { FarcasterProvider } from '@mav/frontend/components/auth/providers/farcaster.provider';
import WalletProvider from '@mav/frontend/components/auth/providers/wallet.provider';
import { useT } from '@mav/react/translation/get.transation.service.client';
type Inputs = {
  email: string;
  password: string;
  providerToken: '';
  provider: 'LOCAL';
};
export function Login() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [notActivated, setNotActivated] = useState(false);
  const { isGeneral, neynarClientId, billingEnabled, genericOauth } =
    useVariables();
  const resolver = useMemo(() => {
    return classValidatorResolver(LoginUserDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    defaultValues: {
      providerToken: '',
      provider: 'LOCAL',
    },
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    setNotActivated(false);
    const login = await fetchData('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        provider: 'LOCAL',
      }),
    });
    if (login.status === 400) {
      const errorMessage = await login.text();
      if (errorMessage === 'User is not activated') {
        setNotActivated(true);
      } else {
        form.setError('email', {
          message: errorMessage,
        });
      }
      setLoading(false);
    }
  };
  return (
    <FormProvider {...form}>
      <form className="flex-1 flex" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col flex-1">
          <div>
            <h1 className="text-[32px] font-semibold -tracking-[0.5px] text-[#1A1A1A]">
              {t('sign_in', 'Sign In')}
            </h1>
            <p className="text-[#6B6B6B] text-sm mt-1">Welcome back to Mav</p>
          </div>
          <div className="text-[13px] text-[#6B6B6B] mt-[28px] mb-[10px] uppercase tracking-wide font-medium">
            {t('continue_with', 'Continue With')}
          </div>
          <div className="flex flex-col">
            {isGeneral && genericOauth ? (
              <OauthProvider />
            ) : !isGeneral ? (
              <GithubProvider />
            ) : (
              <div className="gap-[8px] flex">
                <GoogleProvider />
                {!!neynarClientId && <FarcasterProvider />}
                {billingEnabled && <WalletProvider />}
              </div>
            )}
            <div className="h-[20px] mb-[24px] mt-[24px] relative">
              <div className="absolute w-full h-[1px] bg-[#E8E6E1] top-[50%] -translate-y-[50%]" />
              <div
                className={`absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex`}
              >
                <div className="px-[16px] bg-[#FAFAF8] text-[#6B6B6B] text-xs uppercase tracking-wide">{t('or', 'or')}</div>
              </div>
            </div>
            <div className="flex flex-col gap-[12px]">
              <div className="text-[#1A1A1A]">
                <Input
                  label="Email"
                  translationKey="label_email"
                  {...form.register('email')}
                  type="email"
                  placeholder={t('email_address', 'Email Address')}
                />
                <Input
                  label="Password"
                  translationKey="label_password"
                  {...form.register('password')}
                  autoComplete="off"
                  type="password"
                  placeholder={t('label_password', 'Password')}
                />
              </div>
              {notActivated && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-amber-700 text-sm mb-2">
                    {t(
                      'account_not_activated',
                      'Your account is not activated yet. Please check your email for the activation link.'
                    )}
                  </p>
                  <Link
                    href="/auth/activate"
                    className="text-amber-700 underline hover:font-bold text-sm"
                  >
                    {t('resend_activation_email', 'Resend Activation Email')}
                  </Link>
                </div>
              )}
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl !h-[48px] !bg-[#7C5CFC] hover:!bg-[#6D4AED] !text-white !border-0 !shadow-none font-semibold"
                    loading={loading}
                  >
                    {t('sign_in_1', 'Sign in')}
                  </Button>
                </div>
                <p className="mt-5 text-sm text-[#6B6B6B]">
                  {t('don_t_have_an_account', "Don't have an account?")}&nbsp;
                  <Link href="/auth" className="text-[#7C5CFC] font-medium hover:underline cursor-pointer">
                    {t('sign_up', 'Sign Up')}
                  </Link>
                </p>
                <p className="mt-3 text-sm">
                  <Link
                    href="/auth/forgot"
                    className="text-[#6B6B6B] hover:text-[#7C5CFC] cursor-pointer"
                  >
                    {t('forgot_password', 'Forgot password')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
