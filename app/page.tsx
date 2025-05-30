"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AuthForm from "@/components/auth/auth-form"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Si hay un código en la URL, redirigir a reset-password
    const code = searchParams.get("code")
    if (code) {
      router.push(`/reset-password?code=${code}`)
    }
  }, [searchParams, router])

  return <AuthForm />
}
