'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'credentials' | 'pin'>('credentials');
  const [email, setEmail] = useState('admin@yankun');
  const [password, setPassword] = useState('adminYankun2026!');
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mode: 'credentials' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');

      router.push('/admin/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message);
      setLoading(false);
    }
  };

  const handlePinKey = async (digit: string) => {
    if (pinDigits.length >= 6) return;
    const newDigits = [...pinDigits, digit];
    setPinDigits(newDigits);

    if (newDigits.length === 6) {
      const fullPin = newDigits.join('');
      setLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: fullPin, mode: 'pin' }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'PIN incorrecto');
        }

        router.push('/admin/cocina');
      } catch (err: any) {
        setErrorMessage(err.message);
        setPinDigits([]);
        setLoading(false);
      }
    }
  };

  const handlePinDelete = () => {
    setPinDigits((prev) => prev.slice(0, -1));
  };

  return (
    <div className="bg-surface min-h-screen flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-card border border-outline-variant/30 flex flex-col items-center">
        {/* Status chip */}
        <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-headline font-semibold">
          <span className="material-symbols-outlined text-primary text-[15px]">verified_user</span>
          <span>CRM Shield v4.2 Activo</span>
        </div>

        {/* Master Crest */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-inverse-surface shadow-md mb-3 border border-secondary/30">
          <div className="flex flex-col items-center justify-center text-on-primary">
            <span className="font-headline font-bold text-inverse-primary text-xl leading-none">鮨</span>
            <span className="font-headline text-[8px] tracking-widest text-secondary-fixed uppercase mt-0.5">YanKun</span>
          </div>
        </div>

        <h1 className="font-headline font-bold text-xl text-on-surface text-center">
          Yankun Sushi Lab — CRM
        </h1>
        <p className="text-xs text-on-surface-variant text-center mt-0.5 mb-6">
          Panel de Control Exclusivo para Propietarios y Cocina KDS
        </p>

        {/* Toggle Mode Pills */}
        <div className="w-full grid grid-cols-2 p-1 bg-surface-container rounded-xl mb-6 text-xs font-headline font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('credentials');
              setErrorMessage('');
            }}
            className={`py-2 rounded-lg transition-all ${
              authMode === 'credentials'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('pin');
              setErrorMessage('');
            }}
            className={`py-2 rounded-lg transition-all ${
              authMode === 'pin'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            PIN Rápido Tablet
          </button>
        </div>

        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {authMode === 'credentials' ? (
          /* High Security Form */
          <form onSubmit={handleCredentialsSubmit} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Usuario o Correo Electrónico:
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yankun o admin@yankunsushi.com"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Contraseña de Seguridad:
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-primary hover:bg-primary-container text-white font-headline font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Validando Credenciales...</span>
                </>
              ) : (
                <span>Ingresar al Centro de Control</span>
              )}
            </button>
          </form>
        ) : (
          /* 6-Digit PIN Keypad */
          <div className="w-full flex flex-col items-center">
            {/* 6 Dots */}
            <div className="flex gap-2.5 mb-6">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const filled = pinDigits.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      filled ? 'bg-primary scale-110' : 'bg-surface-container-highest'
                    }`}
                  />
                );
              })}
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handlePinKey(k)}
                  disabled={loading}
                  className="h-12 rounded-xl bg-surface-container text-on-surface font-headline font-bold text-base flex items-center justify-center shadow-sm active:scale-95 active:bg-secondary-fixed transition-transform"
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinDigits([])}
                className="h-12 rounded-xl text-xs font-headline font-semibold text-on-surface-variant flex items-center justify-center active:scale-95"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handlePinKey('0')}
                disabled={loading}
                className="h-12 rounded-xl bg-surface-container text-on-surface font-headline font-bold text-base flex items-center justify-center shadow-sm active:scale-95 active:bg-secondary-fixed transition-transform"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                className="h-12 rounded-xl text-on-surface-variant flex items-center justify-center active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">backspace</span>
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-4 text-center">
              PIN Maestro configurado en variables de entorno (por defecto 888888).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
