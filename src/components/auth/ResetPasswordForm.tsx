'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { sileo } from 'sileo';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Check, AlertTriangle, CheckCircle } from 'lucide-react';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get('oobCode');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validCode, setValidCode] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');

  const passwordRequirements = [
    { label: '8+ chars', met: password.length >= 8 },
    { label: 'Mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Minúscula', met: /[a-z]/.test(password) },
    { label: 'Número', met: /\d/.test(password) },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    if (!oobCode) {
      setValidCode(false);
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setValidCode(true);
      })
      .catch(() => {
        setValidCode(false);
      });
  }, [oobCode]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      sileo.error({ title: 'La contraseña no cumple los requisitos' });
      return;
    }

    if (!passwordsMatch) {
      sileo.error({ title: 'Las contraseñas no coinciden' });
      return;
    }

    if (!oobCode) {
      sileo.error({ title: 'Código inválido' });
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      sileo.success({ title: 'Contraseña actualizada' });
    } catch (error: unknown) {
      const err = error as { code?: string };
      const msg = err.code === 'auth/expired-action-code'
        ? 'El enlace ha expirado'
        : err.code === 'auth/weak-password'
        ? 'La contraseña es muy débil'
        : 'Error al restablecer la contraseña';
      sileo.error({ title: msg });
    } finally {
      setIsLoading(false);
    }
  }, [password, isPasswordValid, passwordsMatch, oobCode]);

  // Verifying code
  if (validCode === null) {
    return (
      <div className="min-h-screen bg-[#18181b] flex items-center justify-center">
        <div className="text-[#a1a1aa]">Verificando enlace...</div>
      </div>
    );
  }

  // Invalid code
  if (validCode === false) {
    return (
      <div className="min-h-screen bg-[#18181b] flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#27272a] rounded-lg flex items-center justify-center border border-[#3f3f46]">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="text-white text-lg font-medium">Consola</span>
        </div>

        <Card className="w-full max-w-[400px] bg-[#27272a] border-[#3f3f46]">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <CardTitle className="text-white text-xl">Enlace inválido</CardTitle>
            <CardDescription className="text-[#a1a1aa]">
              Este enlace de recuperación es inválido o ha expirado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              className="w-full h-10 bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46] hover:text-white"
              asChild
            >
              <Link href="/auth/forgot-password">Solicitar nuevo enlace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="min-h-screen bg-[#18181b] flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#27272a] rounded-lg flex items-center justify-center border border-[#3f3f46]">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="text-white text-lg font-medium">Consola</span>
        </div>

        <Card className="w-full max-w-[400px] bg-[#27272a] border-[#3f3f46]">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <CardTitle className="text-white text-xl">Contraseña actualizada</CardTitle>
            <CardDescription className="text-[#a1a1aa]">
              Tu contraseña se restableció exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              className="w-full h-10 bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46] hover:text-white"
              onClick={() => router.push('/auth/login')}
            >
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#18181b] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-[#27272a] rounded-lg flex items-center justify-center border border-[#3f3f46]">
          <Store className="w-4 h-4 text-white" />
        </div>
        <span className="text-white text-lg font-medium">Consola</span>
      </div>

      {/* Card */}
      <Card className="w-full max-w-[400px] bg-[#27272a] border-[#3f3f46]">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-white text-xl">Nueva contraseña</CardTitle>
          <CardDescription className="text-[#a1a1aa]">
            Ingresa tu nueva contraseña para <span className="text-white">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white text-sm">
                Nueva contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-10 bg-[#18181b] border-[#3f3f46] text-white placeholder:text-[#71717a] focus:border-[#52525b] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              
              {password && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {passwordRequirements.map((req, i) => (
                    <span 
                      key={i} 
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                        req.met 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-[#3f3f46] text-[#71717a]'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      {req.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white text-sm">
                Confirmar contraseña
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className={`h-10 bg-[#18181b] text-white placeholder:text-[#71717a] focus-visible:ring-0 focus-visible:ring-offset-0 ${
                  confirmPassword 
                    ? passwordsMatch 
                      ? 'border-emerald-500/50 focus:border-emerald-500/50' 
                      : 'border-red-500/50 focus:border-red-500/50'
                    : 'border-[#3f3f46] focus:border-[#52525b]'
                }`}
              />
            </div>

            <Button 
              type="submit"
              variant="outline"
              className="w-full h-10 bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46] hover:text-white"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
            >
              {isLoading ? 'Actualizando...' : 'Restablecer contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
