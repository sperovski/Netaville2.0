'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {BrandMark} from '@/components/BrandMark';
import {Button} from '@/components/Button';
import {Field, Input} from '@/components/Field';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
      });
      const data = (await response.json()) as {error?: string};
      if (!response.ok) {
        setError(data.error ?? 'That did not work.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex items-center gap-2.5">
          <BrandMark size={34} />
          <span className="text-lg font-extrabold tracking-tight text-ink">
            Netaville
            <span className="ml-1.5 rounded-full bg-brand-tint px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-brand">
              Admin
            </span>
          </span>
        </div>

        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">
          Staff sign in
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          This panel is for administrators. Students use the Netaville mobile
          app.
        </p>

        <form
          onSubmit={submit}
          className="mt-7 space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
          <Field label="Work email">
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@netaville.mk"
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error === null ? null : (
            <p
              role="alert"
              className="rounded-control border border-coral-edge bg-coral-tint px-3 py-2.5 text-[13px] text-coral-ink">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 rounded-control border border-gold-edge bg-gold-tint px-3.5 py-3 text-[12.5px] leading-relaxed text-gold-ink">
          <strong className="font-bold">Demo build.</strong> Sign in with{' '}
          <code className="font-semibold">stefan.perovski20@gmail.com</code> and
          the password <code className="font-semibold">netaville</code>.
        </p>
      </div>
    </main>
  );
}
