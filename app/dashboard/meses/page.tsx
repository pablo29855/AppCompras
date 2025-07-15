"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, TrendingDown, Minus, Edit3, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Compra, Supermercado } from "@/types/database"

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

const categorias = ["Alimentación", "Transporte", "Entretenimiento", "Salud", "Ropa", "Hogar", "Tecnología", "Otros"]

export default function MesesPage() {
  const [resumenMeses, setResumenMeses] = useState<ResumenMes[]>([])
  const [comprasDetalle, setComprasDetalle] = useState<Compra[]>([])
  const [supermercados, setSupermercados] = useState<Supermercado[]>([])
  const [mesSeleccionado, setMesSeleccionado] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [compraEditando, setCompraEditando] = useState<Compra | null>(null)
  const [nuevaCompra, setNuevaCompra] = useState({
    nombre: "",
    categoria: "Alimentación",
    precio: "",
    cantidad: "1",
    fecha: "",
    supermercado_id: null as string | null,
  })
  const [error, setError] = useState("")

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

      const { data: supermercadosData } = await supabase
        .from("supermercados")
        .select("*")
        .eq("user_id", user.id)
        .order("nombre")

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
          acc[key].total += compra.precio * compra.cantidad
          acc[key].compras += 1
          return acc
        }, {})

        const resumenArray = Object.values(resumen).map((item) => ({
          ...item,
          promedio: item.total / item.compras,
        }))

        setResumenMeses(resumenArray)
      }
      setSupermercados(supermercadosData || [])
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

      setComprasDetalle(comprasData?.map(compra => ({
        ...compra,
        fecha: normalizarFecha(compra.fecha),
      })) || [])
    } catch (error) {
      console.error("Error cargando detalles del mes:", error)
    }
  }

  const normalizarFecha = (fecha: string | Date): string => {
    if (typeof fecha === "string") {
      return fecha.split("T")[0]
    }
    return fecha.toISOString().split("T")[0]
  }

  const parsearFechaLocal = (fechaStr: string): Date => {
    const [año, mes, dia] = fechaStr.split("-").map(Number)
    return new Date(año, mes - 1, dia)
  }

  const editarCompra = async () => {
    setError("")
    if (!compraEditando) return

    if (!nuevaCompra.nombre.trim()) {
      setError("El nombre de la compra es obligatorio")
      return
    }
    if (!nuevaCompra.categoria) {
      setError("La categoría es obligatoria")
      return
    }
    const precio = Number.parseFloat(nuevaCompra.precio)
    if (isNaN(precio) || precio <= 0) {
      setError("El precio debe ser mayor a 0")
      return
    }
    const cantidad = Number.parseInt(nuevaCompra.cantidad)
    if (isNaN(cantidad) || cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0")
      return
    }
    if (!nuevaCompra.fecha) {
      setError("La fecha es obligatoria")
      return
    }

    const fechaCompra = parsearFechaLocal(nuevaCompra.fecha)
    if (isNaN(fechaCompra.getTime())) {
      setError("La fecha es inválida")
      return
    }

    const mes = fechaCompra.getMonth() + 1
    const año = fechaCompra.getFullYear()

    try {
      const compraActualizada = {
        nombre: nuevaCompra.nombre.trim(),
        categoria: nuevaCompra.categoria,
        precio,
        cantidad,
        fecha: nuevaCompra.fecha,
        supermercado_id: nuevaCompra.supermercado_id,
        mes,
        año,
      }

      const { error: supabaseError } = await supabase
        .from("compras")
        .update(compraActualizada)
        .eq("id", compraEditando.id)

      if (supabaseError) {
        setError(`Error al guardar: ${supabaseError.message}`)
        return
      }

      await cargarDetallesMes(mesSeleccionado)
      await cargarResumenMeses()
      cerrarDialogo()
    } catch (error) {
      setError("Error inesperado al editar la compra")
    }
  }

  const eliminarCompra = async (id: string) => {
    try {
      const { error: supabaseError } = await supabase.from("compras").delete().eq("id", id)

      if (supabaseError) {
        setError(`Error al eliminar: ${supabaseError.message}`)
        return
      }

      setComprasDetalle(comprasDetalle.filter((compra) => compra.id !== id))
      await cargarResumenMeses()
    } catch (error) {
      setError("Error inesperado al eliminar la compra")
    }
  }

  const abrirDialogoEdicion = (compra: Compra) => {
    setCompraEditando(compra)
    setNuevaCompra({
      nombre: compra.nombre,
      categoria: compra.categoria,
      precio: compra.precio.toString(),
      cantidad: compra.cantidad.toString(),
      fecha: normalizarFecha(compra.fecha),
      supermercado_id: compra.supermercado_id || null,
    })
    setDialogoAbierto(true)
    setError("")
  }

  const cerrarDialogo = () => {
    setDialogoAbierto(false)
    setCompraEditando(null)
    setError("")
    setNuevaCompra({
      nombre: "",
      categoria: "Alimentación",
      precio: "",
      cantidad: "1",
      fecha: "",
      supermercado_id: null,
    })
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
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-semibold">${(compra.precio * compra.cantidad).toLocaleString("es-CO")} COP</div>
                          <Badge variant="secondary" className="text-xs">
                            {compra.categoria}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => abrirDialogoEdicion(compra)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => eliminarCompra(compra.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diálogo de Edición */}
          <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">Editar Compra</DialogTitle>
                <DialogDescription className="text-sm">Modifica los datos de la compra</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <Label htmlFor="nombre" className="text-sm font-medium">
                    Nombre de la compra
                  </Label>
                  <Input
                    id="nombre"
                    value={nuevaCompra.nombre}
                    onChange={(e) => setNuevaCompra({ ...nuevaCompra, nombre: e.target.value })}
                    placeholder="Ej: Pan integral"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="categoria" className="text-sm font-medium">
                    Categoría
                  </Label>
                  <Select
                    value={nuevaCompra.categoria}
                    onValueChange={(value) => setNuevaCompra({ ...nuevaCompra, categoria: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria} value={categoria}>
                          {categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="precio" className="text-sm font-medium">
                      Precio Unit. (COP)
                    </Label>
                    <Input
                      id="precio"
                      type="number"
                      step="0.01"
                      min="0"
                      value={nuevaCompra.precio}
                      onChange={(e) => setNuevaCompra({ ...nuevaCompra, precio: e.target.value })}
                      placeholder="1000"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cantidad" className="text-sm font-medium">
                      Cantidad
                    </Label>
                    <Input
                      id="cantidad"
                      type="number"
                      min="1"
                      step="1"
                      value={nuevaCompra.cantidad}
                      onChange={(e) => setNuevaCompra({ ...nuevaCompra, cantidad: e.target.value })}
                      placeholder="1"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
                {nuevaCompra.precio && nuevaCompra.cantidad && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Total de esta compra:</div>
                    <div className="text-lg font-bold text-green-600">
                      $
                      {(
                        Number.parseFloat(nuevaCompra.precio || "0") * Number.parseInt(nuevaCompra.cantidad || "1")
                      ).toLocaleString("es-CO")}{" "}
                      COP
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="fecha" className="text-sm font-medium">
                    Fecha
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={nuevaCompra.fecha}
                    onChange={(e) => setNuevaCompra({ ...nuevaCompra, fecha: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="supermercado" className="text-sm font-medium">
                    Supermercado (opcional)
                  </Label>
                  <Select
                    value={nuevaCompra.supermercado_id || "sin_supermercado"}
                    onValueChange={(value) =>
                      setNuevaCompra({
                        ...nuevaCompra,
                        supermercado_id: value === "sin_supermercado" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona un supermercado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin_supermercado">Sin supermercado</SelectItem>
                      {supermercados.map((supermercado) => (
                        <SelectItem key={supermercado.id} value={supermercado.id}>
                          {supermercado.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-md text-sm bg-red-100 text-red-700 border border-red-200">{error}</div>
              )}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={cerrarDialogo} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button onClick={editarCompra} className="w-full sm:w-auto">
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
