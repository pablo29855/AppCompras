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
        // Depuración: Imprimir la URL completa y los parámetros
        const currentUrl = window.location.href;
        console.log("URL completa:", currentUrl);
        console.log("Parámetros de búsqueda:", Object.fromEntries(searchParams.entries()));

        // Verificar parámetros de error en la URL
        const error = searchParams.get("error");
        const errorCode = searchParams.get("error_code");
        const errorDescription = searchParams.get("error_description");

        if (error) {
          console.error("Error en URL:", { error, errorCode, errorDescription });
          if (errorCode === "otp_expired") {
            setMessage("El enlace de restablecimiento ha expirado. Solicita un nuevo enlace.");
          } else {
            setMessage(`Error: ${errorDescription || error}`);
          }
          setIsValidSession(false);
          setCheckingSession(false);
          return;
        }

        // Obtener el token o code
        const token = searchParams.get("token") || searchParams.get("code");
        console.log("Token/Code recibido:", token);

        if (!token) {
          setMessage("No se encontró el token o código de restablecimiento en el enlace. Solicita un nuevo enlace.");
          setIsValidSession(false);
          setCheckingSession(false);
          return;
        }

        // Cerrar cualquier sesión activa para evitar conflictos
        await supabase.auth.signOut();

        // Verificar el token de restablecimiento
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token,
          type: "recovery",
        });

        if (verifyError) {
          console.error("Error al verificar el token:", verifyError);
          if (verifyError.message.includes("Invalid token")) {
            setMessage("El enlace de restablecimiento es inválido o ha expirado. Solicita un nuevo enlace.");
          } else {
            setMessage(`Error al verificar el token: ${verifyError.message}`);
          }
          setIsValidSession(false);
        } else {
          // Verificar si hay una sesión activa después de verificar el OTP
          const { data: { session } } = await supabase.auth.getSession();
          console.log("Sesión después de verifyOtp:", session);
          if (session) {
            setIsValidSession(true);
            setMessage("");
          } else {
            setMessage("No se pudo establecer la sesión. Intenta solicitar un nuevo enlace.");
            setIsValidSession(false);
          }
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