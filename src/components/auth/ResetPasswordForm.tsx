'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { sileo } from 'sileo';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Check, AlertTriangle, CheckCircle } from 'lucide-react';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordRequirements = [
    { label: '8+ chars', met: password.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(password) },
    { label: 'Lowercase', met: /[a-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

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

    if (!token) {
      sileo.error({ title: 'Token inválido' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });

      if (result.error) {
        sileo.error({ title: result.error.message || 'Error al restablecer' });
      } else {
        setSuccess(true);
        sileo.success({ title: 'Contraseña actualizada' });
      }
    } catch {
      sileo.error({ title: 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  }, [password, isPasswordValid, passwordsMatch, token]);

  // Invalid token
  if (!token) {
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
            <CardTitle className="text-white text-xl">Invalid link</CardTitle>
            <CardDescription className="text-[#a1a1aa]">
              This password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              className="w-full h-10 bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46] hover:text-white"
              asChild
            >
              <Link href="/auth/forgot-password">Request new link</Link>
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
            <CardTitle className="text-white text-xl">Password updated</CardTitle>
            <CardDescription className="text-[#a1a1aa]">
              Your password has been reset successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              className="w-full h-10 bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46] hover:text-white"
              asChild
            >
              <Link href="/auth/login">Back to login</Link>
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
          <CardTitle className="text-white text-xl">Set new password</CardTitle>
          <CardDescription className="text-[#a1a1aa]">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white text-sm">
                New password
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
                Confirm password
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
              {isLoading ? 'Updating...' : 'Reset password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
