"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingCart, Mail, Lock, KeyRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { getResetPasswordUrl } from "@/lib/utils/url"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetEmailSent, setResetEmailSent] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      // Validaciones básicas
      if (!email || !password) {
        setMessage("Por favor completa todos los campos.")
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setMessage("La contraseña debe tener al menos 6 caracteres.")
        setLoading(false)
        return
      }

      // Intentar registrar el usuario directamente
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      })

      if (error) {
        console.error("Signup error:", error)

        // Manejar diferentes tipos de errores de Supabase
        if (
          error.message.includes("already registered") ||
          error.message.includes("already exists") ||
          error.message.includes("User already registered")
        ) {
          setMessage("Este correo electrónico ya está registrado. Intenta iniciar sesión.")
        } else if (error.message.includes("Invalid email")) {
          setMessage("Por favor ingresa un correo electrónico válido.")
        } else if (error.message.includes("Password")) {
          setMessage("La contraseña debe tener al menos 6 caracteres.")
        } else if (error.message.includes("rate limit")) {
          setMessage("Demasiados intentos. Espera unos minutos antes de intentar nuevamente.")
        } else {
          setMessage(`Error al crear la cuenta: ${error.message}`)
        }
      } else if (data.user) {
        // Crear perfil de usuario
        try {
          const { error: profileError } = await supabase.from("user_profiles").insert({
            id: data.user.id,
            email: data.user.email?.toLowerCase(),
          })

          if (profileError) {
            console.error("Error creando perfil:", profileError)
          }
        } catch (profileError) {
          console.error("Error en creación de perfil:", profileError)
        }

        if (data.session) {
          // Usuario logueado automáticamente
          router.push("/dashboard")
        } else {
          setMessage("¡Cuenta creada exitosamente! Revisa tu email para confirmar tu cuenta.")
        }
      } else {
        setMessage("Error inesperado al crear la cuenta. Intenta nuevamente.")
      }
    } catch (error) {
      console.error("Error en registro:", error)
      setMessage("Error al crear la cuenta. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      if (!email || !password) {
        setMessage("Por favor completa todos los campos.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (error) {
        console.error("Signin error:", error)

        if (error.message.includes("Invalid login credentials")) {
          setMessage("Credenciales incorrectas. Verifica tu email y contraseña.")
        } else if (error.message.includes("Email not confirmed")) {
          setMessage("Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.")
        } else if (error.message.includes("Too many requests")) {
          setMessage("Demasiados intentos. Espera unos minutos antes de intentar nuevamente.")
        } else {
          setMessage(`Error al iniciar sesión: ${error.message}`)
        }
      } else if (data.session) {
        // Verificar/crear perfil de usuario si no existe
        const { data: profile } = await supabase.from("user_profiles").select("id").eq("id", data.user.id).single()

        if (!profile) {
          // Crear perfil si no existe
          await supabase.from("user_profiles").insert({
            id: data.user.id,
            email: data.user.email?.toLowerCase(),
          })
        }

        router.push("/dashboard")
      } else {
        setMessage("Error inesperado al iniciar sesión. Intenta nuevamente.")
      }
    } catch (error) {
      console.error("Error en inicio de sesión:", error)
      setMessage("Error al iniciar sesión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      if (!resetEmail) {
        setMessage("Por favor ingresa tu correo electrónico.")
        setLoading(false)
        return
      }

      // Simplificar: enviar directamente sin validaciones previas
      // Supabase manejará internamente si el correo existe o no
      const resetUrl = getResetPasswordUrl()
      console.log("Enviando reset a URL:", resetUrl) // Para debug

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.toLowerCase().trim(), {
        redirectTo: resetUrl,
      })

      if (error) {
        console.error("Reset password error:", error)
        if (error.message.includes("rate limit")) {
          setMessage("Demasiados intentos. Espera unos minutos antes de solicitar otro enlace.")
        } else {
          setMessage("Error al enviar el enlace. Intenta nuevamente.")
        }
      } else {
        setResetEmailSent(true)
        setMessage(`Se ha enviado un enlace de restablecimiento a ${resetEmail}. Revisa tu bandeja de entrada y spam.`)
      }
    } catch (error) {
      console.error("Error enviando enlace:", error)
      setMessage("Error al enviar el enlace de restablecimiento. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const resetResetMode = () => {
    setResetMode(false)
    setResetEmailSent(false)
    setResetEmail("")
    setMessage("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShoppingCart className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Compras del Mes</CardTitle>
          <CardDescription>Controla y organiza todos tus gastos del mes</CardDescription>
        </CardHeader>
        <CardContent>
          {!resetMode ? (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Iniciando..." : "Iniciar Sesión"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setResetMode(true)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10"
                        minLength={6}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <KeyRound className="h-12 w-12 text-blue-600 mx-auto" />
                <h3 className="text-lg font-medium">Restablecer Contraseña</h3>
                <p className="text-sm text-gray-600">
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar Enlace"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetResetMode}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          )}

          {message && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                message.includes("exitosamente") || message.includes("enviado")
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
