'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { sileo } from 'sileo';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, ArrowLeft, Mail } from 'lucide-react';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      sileo.error({ title: 'Ingresa tu correo electrónico' });
      return;
    }

    setIsLoading(true);
    try {
      await authClient.forgetPassword.emailOtp({ email });
      setEmailSent(true);
      sileo.success({ title: 'Correo enviado' });
    } catch {
      sileo.error({ title: 'Error al enviar el correo' });
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handleResend = useCallback(async () => {
    setIsLoading(true);
    try {
      await authClient.forgetPassword.emailOtp({ email });
      sileo.success({ title: 'Correo reenviado' });
    } catch {
      sileo.error({ title: 'Error al reenviar' });
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  if (emailSent) {
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
            <div className="w-12 h-12 bg-[#3f3f46] rounded-full flex items-center justify-center mx-auto mb-2">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-white text-xl">Check your email</CardTitle>
            <CardDescription className="text-[#a1a1aa]">
              We sent a password reset link to
              <br />
              <span className="text-white font-medium">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline"
              className="w-full h-10 bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46] hover:text-white"
              onClick={handleResend}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Resend email'}
            </Button>

            <Button 
              variant="ghost"
              className="w-full h-10 text-[#a1a1aa] hover:text-white hover:bg-transparent"
              asChild
            >
              <Link href="/auth/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Link>
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
          <CardTitle className="text-white text-xl">Forgot password?</CardTitle>
          <CardDescription className="text-[#a1a1aa]">
            No worries, we&apos;ll send you reset instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-10 bg-[#18181b] border-[#3f3f46] text-white placeholder:text-[#71717a] focus:border-[#52525b] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <Button 
              type="submit"
              variant="outline"
              className="w-full h-10 bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46] hover:text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Reset password'}
            </Button>
          </form>

          <Button 
            variant="ghost"
            className="w-full h-10 text-[#a1a1aa] hover:text-white hover:bg-transparent"
            asChild
          >
            <Link href="/auth/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
