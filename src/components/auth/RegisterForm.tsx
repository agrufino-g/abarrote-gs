'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sileo } from 'sileo';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
    { label: 'Mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Minúscula', met: /[a-z]/.test(password) },
    { label: 'Número', met: /\d/.test(password) },
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      sileo.success({ title: 'Cuenta creada exitosamente' });
      router.push('/');
    } catch (error: unknown) {
      const err = error as { code?: string };
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Este correo ya está registrado'
        : err.code === 'auth/weak-password'
        ? 'La contraseña es muy débil'
        : err.code === 'auth/invalid-email'
        ? 'Correo electrónico inválido'
        : 'Error al crear la cuenta';
      sileo.error({ title: msg });
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, isPasswordValid, router]);

  const handleGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      sileo.success({ title: 'Cuenta creada exitosamente' });
      router.push('/');
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code !== 'auth/popup-closed-by-user') {
        sileo.error({ title: 'Error al registrarse con Google' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

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
          <CardTitle className="text-white text-xl">Crear cuenta</CardTitle>
          <CardDescription className="text-[#a1a1aa]">
            Ingresa tus datos para comenzar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Button */}
          <Button 
            variant="outline" 
            className="w-full h-11 bg-[#27272a]/50 border-[#3f3f46] text-white hover:bg-[#3f3f46] hover:text-white transition-all"
            disabled={isLoading}
            onClick={handleGoogle}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Registrarse con Google
          </Button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#3f3f46]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#27272a] px-2 text-[#71717a]">O con correo</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white text-sm">
                Nombre
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="h-10 bg-[#18181b] border-[#3f3f46] text-white placeholder:text-[#71717a] focus:border-[#52525b] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white text-sm">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-10 bg-[#18181b] border-[#3f3f46] text-white placeholder:text-[#71717a] focus:border-[#52525b] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white text-sm">
                Contraseña
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
              {isLoading ? 'Creando...' : 'Crear cuenta'}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-[#a1a1aa] pt-2">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-white underline underline-offset-2 hover:no-underline">
              Iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-[#71717a] text-xs text-center mt-8 max-w-[400px]">
        Al continuar, aceptas nuestros{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-[#a1a1aa]">Términos de Servicio</Link>
        {' '}y{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-[#a1a1aa]">Política de Privacidad</Link>.
      </p>
    </div>
  );
}
