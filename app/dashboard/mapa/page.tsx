"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Navigation } from "lucide-react"
import type { Supermercado } from "@/types/database"

export default function MapaPage() {
  const [supermercados, setSupermercados] = useState<Supermercado[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    cargarSupermercados()
  }, [])

  const cargarSupermercados = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: supermercadosData } = await supabase
        .from("supermercados")
        .select("*")
        .eq("user_id", user.id)
        .not("latitud", "is", null)
        .not("longitud", "is", null)
        .order("nombre")

      setSupermercados(supermercadosData || [])
    } catch (error) {
      console.error("Error cargando supermercados:", error)
    } finally {
      setLoading(false)
    }
  }

  const abrirEnGoogleMaps = (supermercado: Supermercado) => {
    if (supermercado.latitud && supermercado.longitud) {
      const url = `https://www.google.com/maps/search/?api=1&query=${supermercado.latitud},${supermercado.longitud}`
      window.open(url, "_blank")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <MapPin className="h-8 w-8" />
          Mapa de Supermercados
        </h1>
        <p className="text-gray-600">Ubicaciones de tus supermercados registrados</p>
      </div>

      {supermercados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-lg font-medium">No hay supermercados con ubicación</p>
            <p className="text-sm text-gray-600">Agrega coordenadas a tus supermercados para verlos en el mapa</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supermercados.map((supermercado) => (
            <Card key={supermercado.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  {supermercado.nombre}
                </CardTitle>
                {supermercado.direccion && <CardDescription>{supermercado.direccion}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p>Latitud: {supermercado.latitud?.toFixed(6)}</p>
                  <p>Longitud: {supermercado.longitud?.toFixed(6)}</p>
                </div>
                <button
                  onClick={() => abrirEnGoogleMaps(supermercado)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Navigation className="h-4 w-4" />
                  Ver en Google Maps
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Mapa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600">
            • Haz clic en "Ver en Google Maps" para abrir la ubicación en una nueva pestaña
          </p>
          <p className="text-sm text-gray-600">
            • Puedes agregar coordenadas a tus supermercados desde la sección "Supermercados"
          </p>
          <p className="text-sm text-gray-600">
            • Usa "Usar mi ubicación actual" al agregar un supermercado para obtener las coordenadas automáticamente
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
