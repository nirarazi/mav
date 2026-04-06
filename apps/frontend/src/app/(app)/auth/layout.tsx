import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { LogoTextComponent } from '@mav/frontend/components/ui/logo-text.component';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

export const dynamic = 'force-dynamic';

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-screen bg-[#FAFAF8]">
      <ReturnUrlComponent />

      {/* Keyframe animations */}
      <style>{`
        @keyframes orbitSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes orbitSpinReverse {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to   { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); opacity: 0.15; }
          25%      { transform: translate(12px, -18px); opacity: 0.35; }
          50%      { transform: translate(-8px, -30px); opacity: 0.20; }
          75%      { transform: translate(16px, -10px); opacity: 0.40; }
        }
        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 40px rgba(255,255,255,0.25), 0 0 80px rgba(255,255,255,0.08); }
          50%      { box-shadow: 0 0 60px rgba(255,255,255,0.45), 0 0 120px rgba(255,255,255,0.15); }
        }
        @keyframes eyeLook {
          0%, 40%, 100% { transform: translate(0, 0); }
          45%            { transform: translate(-3px, -1px); }
          55%            { transform: translate(3px, 1px); }
          60%            { transform: translate(0, 0); }
        }
        @keyframes trailPulse {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50%      { opacity: 0.18; transform: scale(1.15); }
        }
        @keyframes trailPulse2 {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%      { opacity: 0.30; transform: scale(1.1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowDrift {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.04; }
          50%      { transform: translate(30px, -20px) scale(1.2); opacity: 0.08; }
        }
        @keyframes particleOrbit {
          0%   { transform: rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg); }
        }
      `}</style>

      {/* Left — form panel */}
      <div className="flex flex-col flex-1 lg:max-w-[520px] px-6 sm:px-12 py-10 justify-center">
        <div className="w-full max-w-[400px] mx-auto flex flex-col gap-6">
          <LogoTextComponent />
          <div className="flex">{children}</div>
        </div>
      </div>

      {/* Right — brand showcase (desktop only) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-[#7C5CFC] via-[#6D4AED] to-[#5835DB] m-3 rounded-2xl">

        {/* Animated orbital rings */}
        <div className="absolute inset-0">
          <div
            className="absolute w-[500px] h-[500px] rounded-full border border-white/[0.06]"
            style={{ top: '50%', left: '50%', animation: 'orbitSpin 90s linear infinite' }}
          />
          <div
            className="absolute w-[360px] h-[360px] rounded-full border border-white/[0.10]"
            style={{ top: '50%', left: '50%', animation: 'orbitSpinReverse 60s linear infinite' }}
          />
          <div
            className="absolute w-[220px] h-[220px] rounded-full border border-white/[0.15]"
            style={{ top: '50%', left: '50%', animation: 'orbitSpin 40s linear infinite' }}
          />
        </div>

        {/* Orbiting particles — small dots traveling along ring paths */}
        <div className="absolute inset-0" style={{ perspective: '800px' }}>
          {/* Particle on outer ring */}
          <div className="absolute" style={{ top: '50%', left: '50%', width: 0, height: 0 }}>
            <div style={{ '--orbit-radius': '250px', animation: 'particleOrbit 25s linear infinite' } as any}>
              <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
            </div>
          </div>
          {/* Particle on middle ring */}
          <div className="absolute" style={{ top: '50%', left: '50%', width: 0, height: 0 }}>
            <div style={{ '--orbit-radius': '180px', animation: 'particleOrbit 18s linear infinite reverse', animationDelay: '-5s' } as any}>
              <div className="w-2 h-2 rounded-full bg-white/25" />
            </div>
          </div>
          {/* Particle on inner ring */}
          <div className="absolute" style={{ top: '50%', left: '50%', width: 0, height: 0 }}>
            <div style={{ '--orbit-radius': '110px', animation: 'particleOrbit 12s linear infinite', animationDelay: '-3s' } as any}>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            </div>
          </div>
          {/* Second particle on outer ring, offset */}
          <div className="absolute" style={{ top: '50%', left: '50%', width: 0, height: 0 }}>
            <div style={{ '--orbit-radius': '250px', animation: 'particleOrbit 30s linear infinite', animationDelay: '-15s' } as any}>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>
          </div>
        </div>

        {/* Drifting ambient particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[18%] left-[22%] w-2 h-2 rounded-full bg-white/20" style={{ animation: 'drift 8s ease-in-out infinite' }} />
          <div className="absolute top-[30%] right-[18%] w-3 h-3 rounded-full bg-white/15" style={{ animation: 'drift 12s ease-in-out infinite 2s' }} />
          <div className="absolute bottom-[25%] left-[35%] w-1.5 h-1.5 rounded-full bg-white/25" style={{ animation: 'drift 10s ease-in-out infinite 4s' }} />
          <div className="absolute top-[55%] right-[30%] w-2.5 h-2.5 rounded-full bg-white/10" style={{ animation: 'drift 14s ease-in-out infinite 1s' }} />
          <div className="absolute bottom-[40%] left-[15%] w-2 h-2 rounded-full bg-white/20" style={{ animation: 'drift 9s ease-in-out infinite 3s' }} />
          <div className="absolute top-[12%] right-[40%] w-1 h-1 rounded-full bg-white/30" style={{ animation: 'drift 7s ease-in-out infinite 5s' }} />
          <div className="absolute bottom-[15%] right-[22%] w-2 h-2 rounded-full bg-white/15" style={{ animation: 'drift 11s ease-in-out infinite 2.5s' }} />
        </div>

        {/* Agent dot with trail — center piece */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Trail dots with pulse */}
            <div
              className="absolute -left-16 top-4 w-5 h-5 rounded-full bg-white"
              style={{ animation: 'trailPulse 4s ease-in-out infinite' }}
            />
            <div
              className="absolute -left-8 top-1 w-7 h-7 rounded-full bg-white"
              style={{ animation: 'trailPulse2 3s ease-in-out infinite 0.5s' }}
            />
            {/* Main agent dot with breathing glow */}
            <div
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center"
              style={{ animation: 'breathe 4s ease-in-out infinite' }}
            >
              {/* Eye with subtle look animation */}
              <div
                className="w-8 h-8 rounded-full bg-[#7C5CFC]"
                style={{ animation: 'eyeLook 8s ease-in-out infinite' }}
              />
            </div>
          </div>
        </div>

        {/* Tagline with fade-in */}
        <div
          className="absolute bottom-12 left-0 right-0 text-center px-8"
          style={{ animation: 'fadeSlideUp 1s ease-out 0.3s both' }}
        >
          <p className="text-white/90 text-xl font-medium tracking-tight">
            Autonomous social media
          </p>
          <p className="text-white/50 text-sm mt-2">
            Your agent publishes, engages, and grows — while you build.
          </p>
        </div>

        {/* Animated ambient glows */}
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/[0.04] blur-3xl"
          style={{ animation: 'glowDrift 20s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/[0.06] blur-3xl"
          style={{ animation: 'glowDrift 16s ease-in-out infinite 8s' }}
        />
      </div>
    </div>
  );
}
