'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConnectionProvider,
  useWallet,
  WalletProvider as WalletProviderWrapper,
} from '@solana/wallet-adapter-react';
import { useWalletMultiButton } from '@solana/wallet-adapter-base-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
// Wallet adapters stubbed — Web3 auth not needed for Maverick
const TorusWalletAdapter = class {} as any;
const BitgetWalletAdapter = class {} as any;
const CloverWalletAdapter = class {} as any;
const Coin98WalletAdapter = class {} as any;
const FractalWalletAdapter = class {} as any;
const HyperPayWalletAdapter = class {} as any;
const KeystoneWalletAdapter = class {} as any;
const KrystalWalletAdapter = class {} as any;
const LedgerWalletAdapter = class {} as any;
const MathWalletAdapter = class {} as any;
const NightlyWalletAdapter = class {} as any;
const NufiWalletAdapter = class {} as any;
const OntoWalletAdapter = class {} as any;
const ParticleAdapter = class {} as any;
const PhantomWalletAdapter = class {} as any;
const SafePalWalletAdapter = class {} as any;
const SaifuWalletAdapter = class {} as any;
const SalmonWalletAdapter = class {} as any;
const SolflareWalletAdapter = class {} as any;
const TokenaryWalletAdapter = class {} as any;
const TrustWalletAdapter = class {} as any;
const XDEFIWalletAdapter = class {} as any;
const TokenPocketWalletAdapter = class {} as any;
import {
  WalletModalProvider,
  useWalletModal,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';
import { useFetch } from '@maverick/helpers/utils/custom.fetch';
import { WalletUiProvider } from '@maverick/frontend/components/auth/providers/placeholder/wallet.ui.provider';
const WalletProvider = () => {
  const gotoLogin = useCallback(async (code: string) => {
    window.location.href = `/auth?provider=FARCASTER&code=${code}`;
  }, []);
  return <ButtonCaster login={gotoLogin} />;
};
export const ButtonCaster: FC<{
  login: (code: string) => void;
}> = (props) => {
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
      new TokenPocketWalletAdapter(),
      new TorusWalletAdapter(),
      new BitgetWalletAdapter(),
      new CloverWalletAdapter(),
      new Coin98WalletAdapter(),
      new FractalWalletAdapter(),
      new HyperPayWalletAdapter(),
      new KeystoneWalletAdapter(),
      new KrystalWalletAdapter(),
      new LedgerWalletAdapter(),
      new MathWalletAdapter(),
      new NightlyWalletAdapter(),
      new NufiWalletAdapter(),
      new OntoWalletAdapter(),
      new ParticleAdapter(),
      new PhantomWalletAdapter(),
      new SafePalWalletAdapter(),
      new SaifuWalletAdapter(),
      new SalmonWalletAdapter(),
      new SolflareWalletAdapter(),
      new TokenaryWalletAdapter(),
      new TrustWalletAdapter(),
      new XDEFIWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProviderWrapper wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <DisabledAutoConnect />
        </WalletModalProvider>
      </WalletProviderWrapper>
    </ConnectionProvider>
  );
};
const DisabledAutoConnect = () => {
  const [connect, setConnect] = useState(false);
  const wallet = useWallet();
  const toConnect = useCallback(async () => {
    try {
      wallet.select(null);
    } catch (err) {
      /** empty */
    }
    try {
      await wallet.disconnect();
    } catch (err) {
      /** empty */
    }
    setConnect(true);
  }, []);
  useEffect(() => {
    toConnect();
  }, []);
  if (connect) {
    return <InnerWallet />;
  }
  return <WalletUiProvider />;
};
const InnerWallet = () => {
  const walletModal = useWalletModal();
  const wallet = useWallet();
  const fetch = useFetch();
  const { buttonState } = useWalletMultiButton({
    onSelectWallet: () => {
      return;
    },
  });
  const connect = useCallback(async () => {
    if (buttonState !== 'connected') {
      return;
    }
    try {
      const challenge = await (
        await fetch(
          `/auth/oauth/WALLET?publicKey=${wallet?.publicKey?.toString()}`
        )
      ).text();
      const encoded = new TextEncoder().encode(challenge);
      const signed = await wallet?.signMessage?.(encoded)!;
      const info = Buffer.from(
        JSON.stringify({
          // @ts-ignore
          signature: Buffer.from(signed).toString('hex'),
          challenge,
          publicKey: wallet?.publicKey?.toString(),
        })
      ).toString('base64');
      window.location.href = `/auth?provider=WALLET&code=${info}`;
    } catch (err) {
      walletModal.setVisible(false);
      wallet.select(null);
      wallet.disconnect().catch(() => {
        /** empty */
      });
    }
  }, [wallet, buttonState]);
  useEffect(() => {
    if (buttonState === 'has-wallet') {
      wallet
        .connect()
        .then(() => {
          /** empty */
        })
        .catch(() => {
          wallet.select(null);
          wallet.disconnect();
        });
    }
    if (buttonState === 'connected') {
      connect();
    }
  }, [buttonState]);
  return (
    <div onClick={() => walletModal.setVisible(true)} className="flex-1">
      <WalletUiProvider />
    </div>
  );
};
export default WalletProvider;
