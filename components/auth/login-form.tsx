'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);

    if (error) {
      toast.error('No pudimos enviar el link. ¿Correo correcto?');
      return;
    }
    setSent(true);
  }

  async function onGoogle() {
    const supabase = supabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (sent) {
    return (
      <div className="space-y-3 text-sm">
        <div className="p-4 rounded-lg bg-[#f0fdf4] border border-[#dcfce7] text-[#14532d]">
          <strong>Revisa tu correo.</strong> Te enviamos un link a{' '}
          <code className="font-mono text-xs">{email}</code>.
        </div>
        <button
          onClick={() => setSent(false)}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="email" className="text-xs">
          Correo del proyecto
        </Label>
        <div className="relative mt-1.5">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            required
            placeholder="tu@dominio.com"
            className="pl-9 h-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-9 bg-neutral-900 hover:bg-neutral-800 text-white group"
      >
        {loading ? (
          'Enviando…'
        ) : (
          <>
            Enviar link mágico
            <ArrowRight className="w-3.5 h-3.5 ml-2 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground uppercase tracking-wider font-medium my-5">
        <span className="flex-1 h-px bg-border" />
        <span>o continúa con</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onGoogle}
        className="w-full h-9"
      >
        <svg className="w-3.5 h-3.5 mr-2" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuar con Google
      </Button>

      <div className="mt-4 p-3 rounded-lg bg-[#f0fdf4] border border-[#dcfce7] text-[12px] leading-relaxed text-[#14532d] flex gap-2">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#15803d]" />
        <p>
          <strong>Solo correos autorizados.</strong> Tu PM debe tenerte
          registrado en la base de Equipo de Notion con este email.
        </p>
      </div>
    </form>
  );
}
