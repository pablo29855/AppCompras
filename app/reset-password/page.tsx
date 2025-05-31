"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Lock, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
       
        const error = searchParams.get("error");
        const errorCode = searchParams.get("error_code");
        const errorDescription = searchParams.get("error_description");

        if (error && errorCode === "otp_expired") {
          setMessage("El enlace de restablecimiento ha expirado. Solicita un nuevo enlace.");
          setIsValidSession(false);
          setCheckingSession(false);
          return;
        }

        const code = searchParams.get("code");
        if (!code) {
          setMessage("No se encontró el código de restablecimiento en el enlace. Solicita un nuevo enlace.");
          setIsValidSession(false);
          setCheckingSession(false);
          return;
        }

        console.log("Código recibido:", code);

        
        await supabase.auth.signOut();

        
        const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code);

        if (authError) {
          console.error("Error al intercambiar el código:", authError.message);
          if (authError.message.includes("code verifier")) {
            setMessage("Error en el flujo de autenticación. Solicita un nuevo enlace de restablecimiento.");
          } else if (authError.code === "invalid_grant") {
            setMessage("El enlace de restablecimiento ha expirado o ya se usó. Solicita un nuevo enlace.");
          } else {
            setMessage(`Error: ${authError.message}`);
          }
          setIsValidSession(false);
        } else if (data.session) {
          setIsValidSession(true);
          setMessage("");
        } else {
          setMessage("No se pudo validar la sesión. Intenta solicitar un nuevo enlace.");
          setIsValidSession(false);
        }
      } catch (error) {
        console.error("Error inesperado:", error);
        setMessage("Error al procesar el enlace. Solicita un nuevo enlace.");
        setIsValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    handleAuthCallback();
  }, [searchParams, supabase.auth]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message);
      } else {
        setIsSuccess(true);
        setMessage("¡Contraseña actualizada exitosamente!");
        setTimeout(() => router.push("/dashboard"), 3000);
      }
    } catch (error) {
      console.error("Error al actualizar la contraseña:", error);
      setMessage("Error al actualizar la contraseña. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600">Verificando enlace de restablecimiento...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-700">Enlace Inválido</CardTitle>
            <CardDescription>El enlace de restablecimiento no es válido o ha expirado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && <div className="p-3 rounded-md text-sm bg-red-100 text-red-700">{message}</div>}
            <div className="space-y-2">
              <Button onClick={() => router.push("/")} className="w-full">
                Volver al Inicio de Sesión
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Solicita un nuevo enlace de restablecimiento desde la página de inicio de sesión
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">¡Contraseña Actualizada!</CardTitle>
            <CardDescription>Tu contraseña ha sido cambiada exitosamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-md text-sm bg-green-100 text-green-700">{message}</div>
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">Serás redirigido al dashboard en unos segundos...</p>
              <Button onClick={() => router.push("/dashboard")} className="w-full">
                Ir al Dashboard Ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShoppingCart className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Restablecer Contraseña</CardTitle>
          <CardDescription>Ingresa tu nueva contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar Contraseña"}
            </Button>
          </form>

          {message && !isSuccess && (
            <div className="mt-4 p-3 rounded-md text-sm bg-red-100 text-red-700">{message}</div>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}