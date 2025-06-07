"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ShoppingCart, Mail, Lock, KeyRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { getBaseUrl, getResetPasswordUrl } from "@/lib/utils/url"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const router = useRouter()
  const supabase = createClient()

  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetEmailSent, setResetEmailSent] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setMessageType("")

    try {
      // Validaciones básicas
      if (!email || !password) {
        setMessage("Por favor completa todos los campos.")
        setMessageType("error")
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setMessage("La contraseña debe tener al menos 6 caracteres.")
        setMessageType("error")
        setLoading(false)
        return
      }

      // Verificar si el correo ya está registrado
      const { data: existingUser, error: checkError } = await supabase
        .from("auth.users")
        .select("email")
        .eq("email", email.toLowerCase().trim())
        .single()

      if (checkError && checkError.code !== "PGRST116") { // PGRST116 indica no encontrado
        setMessage("Error al verificar el correo.")
        setMessageType("error")
        setLoading(false)
        return
      }

      if (existingUser) {
        setMessage("Este correo electrónico ya está registrado. Intenta iniciar sesión.")
        setMessageType("error")
        setLoading(false)
        return
      }

      // Intentar registrar el usuario directamente sin requerir confirmación de correo
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${getBaseUrl()}/dashboard`,
          data: {
            email_confirmed: true,
          },
        },
      })

      if (error) {
        // Manejar diferentes tipos de errores de Supabase
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          setMessage("Este correo electrónico ya está registrado. Intenta iniciar sesión.")
          setMessageType("error")
        } else if (error.message.includes("Invalid email")) {
          setMessage("Por favor ingresa un correo electrónico válido.")
          setMessageType("error")
        } else if (error.message.includes("Password")) {
          setMessage("La contraseña debe tener al menos 6 caracteres.")
          setMessageType("error")
        } else if (error.message.includes("rate limit")) {
          setMessage("Demasiados intentos. Espera unos minutos antes de intentar nuevamente.")
          setMessageType("error")
        } else {
          setMessage(`Error al crear la cuenta: ${error.message}`)
          setMessageType("error")
        }
      } else if (data.user) {
        // Crear perfil de usuario
        const { error: profileError } = await supabase
          .from("user_profiles")
          .insert({
            id: data.user.id,
            email: data.user.email?.toLowerCase(),
          })
          .select()

        if (profileError) {
          // Si falla crear el perfil, no bloqueamos el flujo, solo logueamos
          setMessage("Cuenta creada, pero hubo un error al guardar el perfil.")
          setMessageType("error")
        } else {
          setMessage("Cuenta creada exitosamente. Iniciando sesión...")
          setMessageType("success")
          setTimeout(() => {
            router.push("/dashboard")
          }, 1500) // Retraso para mostrar el mensaje
        }
      } else {
        setMessage("Error inesperado al crear la cuenta. Intenta nuevamente.")
        setMessageType("error")
      }
    } catch (error) {
      setMessage("Error al crear la cuenta. Intenta nuevamente.")
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setMessageType("")

    try {
      if (!email || !password) {
        setMessage("Por favor completa todos los campos.")
        setMessageType("error")
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setMessage("Credenciales incorrectas. Verifica tu email y contraseña.")
          setMessageType("error")
        } else if (error.message.includes("Email not confirmed")) {
          setMessage("Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.")
          setMessageType("error")
        } else if (error.message.includes("Too many requests")) {
          setMessage("Demasiados intentos. Espera unos minutos antes de solicitar otro enlace.")
          setMessageType("error")
        } else {
          setMessage(`Error al iniciar sesión: ${error.message}`)
          setMessageType("error")
        }
      } else if (data.session) {
        // Verificar/crear perfil de usuario si no existe
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", data.user.id)
          .single()

        if (!profile) {
          await supabase.from("user_profiles").insert({
            id: data.user.id,
            email: data.user.email?.toLowerCase(),
          })
        }

        router.push("/dashboard")
      } else {
        setMessage("Error inesperado al iniciar sesión. Intenta nuevamente.")
        setMessageType("error")
      }
    } catch (error) {
      setMessage("Error al iniciar sesión. Intenta nuevamente.")
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setMessageType("")

    try {
      if (!resetEmail) {
        setMessage("Por favor ingresa tu correo electrónico.")
        setMessageType("error")
        setLoading(false)
        return
      }

      const redirectUrl = `${getResetPasswordUrl()}?email=${encodeURIComponent(resetEmail.toLowerCase().trim())}`

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.toLowerCase().trim(), {
        redirectTo: redirectUrl,
      })

      if (error) {
        if (error.message.includes("rate limit")) {
          setMessage("Demasiados intentos. Espera unos minutos antes de solicitar otro enlace.")
          setMessageType("error")
        } else {
          setMessage("Error al enviar el enlace. Intenta nuevamente.")
          setMessageType("error")
        }
      } else {
        setResetEmailSent(true)
        setMessage(`Se ha enviado un enlace de restablecimiento a ${resetEmail}. Revisa tu bandeja de entrada y spam.`)
        setMessageType("success")
      }
    } catch (error) {
      setMessage("Error al enviar el enlace de restablecimiento. Intenta nuevamente.")
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  const resetResetMode = () => {
    setResetMode(false)
    setResetEmailSent(false)
    setResetEmail("")
    setMessage("")
    setMessageType("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShoppingCart className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">Compras del Mes</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Controla y organiza todos tus gastos del mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!resetMode ? (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700">
                <TabsTrigger value="signin" className="text-gray-900 dark:text-gray-100 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-gray-900 dark:text-gray-100 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                  Registrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-900 dark:text-gray-100">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-900 dark:text-gray-100">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600" disabled={loading}>
                    {loading ? "Iniciando..." : "Iniciar Sesión"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setResetMode(true)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-900 dark:text-gray-100">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-900 dark:text-gray-100">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        minLength={6}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Mínimo 6 caracteres</p>
                  </div>
                  <Button type="submit" className="w-full bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600" disabled={loading}>
                    {loading ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <KeyRound className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Restablecer Contraseña</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-gray-900 dark:text-gray-100">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar Enlace"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetResetMode} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600">
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          )}

          {message && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                messageType === "success"
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100"
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