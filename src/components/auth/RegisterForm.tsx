'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sileo } from 'sileo';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Check } from 'lucide-react';

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: '8+ chars', met: password.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(password) },
    { label: 'Lowercase', met: /[a-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.met);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      sileo.error({ title: 'Por favor completa todos los campos' });
      return;
    }

    if (!isPasswordValid) {
      sileo.error({ title: 'La contraseña no cumple los requisitos' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.signUp.email({ email, password, name });
      console.log('SignUp result:', result);

      if (result.error) {
        sileo.error({ title: result.error.message || 'Error al crear la cuenta' });
      } else {
        sileo.success({ title: 'Cuenta creada exitosamente' });
        router.push('/auth/login');
      }
    } catch (error: unknown) {
      console.error('SignUp error:', error);
      const err = error as { message?: string; response?: { data?: { message?: string } } };
      const message = err?.message || err?.response?.data?.message || 'Error de conexión';
      sileo.error({ title: message });
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, isPasswordValid, router]);

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
          <CardTitle className="text-white text-xl">Create an account</CardTitle>
          <CardDescription className="text-[#a1a1aa]">
            Enter your details to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white text-sm">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="h-10 bg-[#18181b] border-[#3f3f46] text-white placeholder:text-[#71717a] focus:border-[#52525b] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white text-sm">
                Password
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

            <Button 
              type="submit"
              variant="outline"
              className="w-full h-10 bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46] hover:text-white mt-2"
              disabled={isLoading || !isPasswordValid}
            >
              {isLoading ? 'Creating...' : 'Create account'}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-[#a1a1aa] pt-2">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-white underline underline-offset-2 hover:no-underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-[#71717a] text-xs text-center mt-8 max-w-[400px]">
        By clicking continue, you agree to our{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-[#a1a1aa]">Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-[#a1a1aa]">Privacy Policy</Link>.
      </p>
    </div>
  );
}
