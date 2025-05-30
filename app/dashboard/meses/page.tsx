"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { Compra } from "@/types/database"

interface ResumenMes {
  mes: number
  año: number
  total: number
  compras: number
  promedio: number
}

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

export default function MesesPage() {
  const [resumenMeses, setResumenMeses] = useState<ResumenMes[]>([])
  const [comprasDetalle, setComprasDetalle] = useState<Compra[]>([])
  const [mesSeleccionado, setMesSeleccionado] = useState("")
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    cargarResumenMeses()
  }, [])

  useEffect(() => {
    if (mesSeleccionado) {
      cargarDetallesMes(mesSeleccionado)
    }
  }, [mesSeleccionado])

  const cargarResumenMeses = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: comprasData } = await supabase
        .from("compras")
        .select("*")
        .eq("user_id", user.id)
        .order("año", { ascending: false })
        .order("mes", { ascending: false })

      if (comprasData) {
        const resumen = comprasData.reduce((acc: { [key: string]: ResumenMes }, compra) => {
          const key = `${compra.año}-${compra.mes}`
          if (!acc[key]) {
            acc[key] = {
              mes: compra.mes,
              año: compra.año,
              total: 0,
              compras: 0,
              promedio: 0,
            }
          }
          acc[key].total += compra.precio
          acc[key].compras += 1
          return acc
        }, {})

        const resumenArray = Object.values(resumen).map((item) => ({
          ...item,
          promedio: item.total / item.compras,
        }))

        setResumenMeses(resumenArray)
      }
    } catch (error) {
      console.error("Error cargando resumen de meses:", error)
    } finally {
      setLoading(false)
    }
  }

  const cargarDetallesMes = async (mesAño: string) => {
    try {
      const [año, mes] = mesAño.split("-")
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: comprasData } = await supabase
        .from("compras")
        .select(`
          *,
          supermercado:supermercados(*)
        `)
        .eq("user_id", user.id)
        .eq("mes", Number.parseInt(mes))
        .eq("año", Number.parseInt(año))
        .order("fecha", { ascending: false })

      setComprasDetalle(comprasData || [])
    } catch (error) {
      console.error("Error cargando detalles del mes:", error)
    }
  }

  const obtenerTendencia = (index: number) => {
    if (index === resumenMeses.length - 1) return null
    const actual = resumenMeses[index].total
    const anterior = resumenMeses[index + 1].total
    const diferencia = actual - anterior
    const porcentaje = ((diferencia / anterior) * 100).toFixed(1)

    if (diferencia > 0) {
      return { tipo: "aumento", valor: porcentaje, icono: TrendingUp, color: "text-red-600" }
    } else if (diferencia < 0) {
      return {
        tipo: "disminución",
        valor: Math.abs(Number.parseFloat(porcentaje)).toFixed(1),
        icono: TrendingDown,
        color: "text-green-600",
      }
    } else {
      return { tipo: "igual", valor: "0", icono: Minus, color: "text-gray-600" }
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
          <Calendar className="h-8 w-8" />
          Compras por Mes
        </h1>
        <p className="text-gray-600">Compara tus gastos mensuales y analiza tendencias</p>
      </div>

      {resumenMeses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-lg font-medium">No hay datos de meses anteriores</p>
            <p className="text-sm text-gray-600">Comienza agregando compras para ver el historial</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen de Meses */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumenMeses.map((resumen, index) => {
              const tendencia = obtenerTendencia(index)
              const TendenciaIcon = tendencia?.icono

              return (
                <Card
                  key={`${resumen.año}-${resumen.mes}`}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setMesSeleccionado(`${resumen.año}-${resumen.mes}`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {meses[resumen.mes - 1]} {resumen.año}
                    </CardTitle>
                    {tendencia && (
                      <div className={`flex items-center gap-1 text-sm ${tendencia.color}`}>
                        <TendenciaIcon className="h-4 w-4" />
                        {tendencia.valor}% vs mes anterior
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      ${resumen.total.toLocaleString("es-CO")} COP
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{resumen.compras} compras</span>
                      <span>Promedio: ${Math.round(resumen.promedio).toLocaleString("es-CO")}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Selector de Mes para Detalles */}
          <Card>
            <CardHeader>
              <CardTitle>Ver Detalles del Mes</CardTitle>
              <CardDescription>Selecciona un mes para ver todas las compras</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Selecciona un mes" />
                </SelectTrigger>
                <SelectContent>
                  {resumenMeses.map((resumen) => (
                    <SelectItem key={`${resumen.año}-${resumen.mes}`} value={`${resumen.año}-${resumen.mes}`}>
                      {meses[resumen.mes - 1]} {resumen.año}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Detalles del Mes Seleccionado */}
          {mesSeleccionado && comprasDetalle.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Compras de {meses[Number.parseInt(mesSeleccionado.split("-")[1]) - 1]} {mesSeleccionado.split("-")[0]}
                </CardTitle>
                <CardDescription>{comprasDetalle.length} compras realizadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comprasDetalle.map((compra) => (
                    <div key={compra.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{compra.nombre}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(compra.fecha).toLocaleDateString("es-CO")} •{" "}
                          {compra.supermercado?.nombre || "Sin especificar"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${compra.precio.toLocaleString("es-CO")} COP</div>
                        <Badge variant="secondary" className="text-xs">
                          {compra.categoria}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
