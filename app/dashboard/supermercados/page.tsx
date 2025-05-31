"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Store, Edit3, Trash2, MapPin } from "lucide-react"
import type { Supermercado } from "@/types/database"

export default function SupermercadosPage() {
  const [supermercados, setSupermercados] = useState<Supermercado[]>([])
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [supermercadoEditando, setSupermercadoEditando] = useState<Supermercado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [nuevoSupermercado, setNuevoSupermercado] = useState({
    nombre: "",
    direccion: "",
    latitud: "",
    longitud: "",
  })

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
        .order("nombre")

      setSupermercados(supermercadosData || [])
    } catch (error) {
      setError("Error cargando supermercados:", error)
    } finally {
      setLoading(false)
    }
  }

  const agregarSupermercado = async () => {
    if (!nuevoSupermercado.nombre.trim()) {
      setError("El nombre del supermercado es obligatorio.")
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("Error: Usuario no autenticado")
        return
      }

      const supermercado = {
        user_id: user.id,
        nombre: nuevoSupermercado.nombre.trim(),
        direccion: nuevoSupermercado.direccion.trim() || null,
        latitud: nuevoSupermercado.latitud ? Number.parseFloat(nuevoSupermercado.latitud) : null,
        longitud: nuevoSupermercado.longitud ? Number.parseFloat(nuevoSupermercado.longitud) : null,
      }

      // Validar coordenadas si se proporcionan
      if (
        supermercado.latitud &&
        (isNaN(supermercado.latitud) || supermercado.latitud < -90 || supermercado.latitud > 90)
      ) {
        setError("La latitud debe estar entre -90 y 90 grados.")
        return
      }

      if (
        supermercado.longitud &&
        (isNaN(supermercado.longitud) || supermercado.longitud < -180 || supermercado.longitud > 180)
      ) {
        setError("La longitud debe estar entre -180 y 180 grados.")
        return
      }

      const { data, error } = await supabase.from("supermercados").insert(supermercado).select()

      if (error) {
        setError("Error de Supabase:", error)
        setError(`Error al agregar supermercado: ${error.message}`)
        return
      }

      if (data && data[0]) {
        setSupermercados([...supermercados, data[0]])
        setError("¡Supermercado agregado exitosamente!")
      }

      setNuevoSupermercado({ nombre: "", direccion: "", latitud: "", longitud: "" })
      setDialogoAbierto(false)
    } catch (error) {
      setError("Error agregando supermercado:", error)
      setError("Error inesperado al agregar el supermercado. Por favor intenta nuevamente.")
    }
  }

  const editarSupermercado = async () => {
    if (supermercadoEditando && nuevoSupermercado.nombre) {
      try {
        const supermercadoActualizado = {
          nombre: nuevoSupermercado.nombre,
          direccion: nuevoSupermercado.direccion || null,
          latitud: nuevoSupermercado.latitud ? Number.parseFloat(nuevoSupermercado.latitud) : null,
          longitud: nuevoSupermercado.longitud ? Number.parseFloat(nuevoSupermercado.longitud) : null,
        }

        const { error } = await supabase
          .from("supermercados")
          .update(supermercadoActualizado)
          .eq("id", supermercadoEditando.id)

        if (error) throw error

        await cargarSupermercados()
        setSupermercadoEditando(null)
        setNuevoSupermercado({ nombre: "", direccion: "", latitud: "", longitud: "" })
        setDialogoAbierto(false)
      } catch (error) {
        setError("Error editando supermercado:", error)
      }
    }
  }

  const eliminarSupermercado = async (id: string) => {
    try {
      const { error } = await supabase.from("supermercados").delete().eq("id", id)

      if (error) throw error

      setSupermercados(supermercados.filter((supermercado) => supermercado.id !== id))
    } catch (error) {
      setError("Error eliminando supermercado:", error)
    }
  }

  const abrirDialogoEdicion = (supermercado: Supermercado) => {
    setSupermercadoEditando(supermercado)
    setNuevoSupermercado({
      nombre: supermercado.nombre,
      direccion: supermercado.direccion || "",
      latitud: supermercado.latitud?.toString() || "",
      longitud: supermercado.longitud?.toString() || "",
    })
    setDialogoAbierto(true)
  }

  const cerrarDialogo = () => {
    setDialogoAbierto(false)
    setSupermercadoEditando(null)
    setNuevoSupermercado({ nombre: "", direccion: "", latitud: "", longitud: "" })
  }

  const obtenerUbicacionActual = () => {
    if (!navigator.geolocation) {
      setError("La geolocalización no está soportada en este navegador.")
      return
    }

    // Mostrar loading
    const button = document.querySelector("[data-location-btn]")
    if (button) {
      button.textContent = "Obteniendo ubicación..."
      button.disabled = true
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNuevoSupermercado({
          ...nuevoSupermercado,
          latitud: position.coords.latitude.toFixed(6),
          longitud: position.coords.longitude.toFixed(6),
        })

        // Restaurar botón
        if (button) {
          button.textContent = "Usar mi ubicación actual"
          button.disabled = false
        }

        setError("¡Ubicación obtenida exitosamente!")
      },
      (error) => {
        let errorMessage = "Error obteniendo ubicación: "
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Permiso denegado. Por favor permite el acceso a tu ubicación."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Ubicación no disponible."
            break
          case error.TIMEOUT:
            errorMessage += "Tiempo de espera agotado."
            break
          default:
            errorMessage += "Error desconocido."
            break
        }

        setError(errorMessage)
        setError("Error de geolocalización:", error)

        // Restaurar botón
        if (button) {
          button.textContent = "Usar mi ubicación actual"
          button.disabled = false
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    )
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
          <Store className="h-8 w-8" />
          Gestión de Supermercados
        </h1>
        <p className="text-gray-600">Administra los supermercados donde realizas tus compras</p>
      </div>

      {/* Botón para agregar supermercado */}
      <div className="flex justify-end">
        <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogoAbierto(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Supermercado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{supermercadoEditando ? "Editar Supermercado" : "Añadir Nuevo Supermercado"}</DialogTitle>
              <DialogDescription>
                {supermercadoEditando
                  ? "Modifica los datos del supermercado"
                  : "Completa los datos del nuevo supermercado"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del supermercado</Label>
                <Input
                  id="nombre"
                  value={nuevoSupermercado.nombre}
                  onChange={(e) => setNuevoSupermercado({ ...nuevoSupermercado, nombre: e.target.value })}
                  placeholder="Ej: Éxito, Carulla, Jumbo"
                />
              </div>
              <div>
                <Label htmlFor="direccion">Dirección (opcional)</Label>
                <Input
                  id="direccion"
                  value={nuevoSupermercado.direccion}
                  onChange={(e) => setNuevoSupermercado({ ...nuevoSupermercado, direccion: e.target.value })}
                  placeholder="Ej: Calle 123 #45-67"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitud">Latitud (opcional)</Label>
                  <Input
                    id="latitud"
                    type="number"
                    step="any"
                    value={nuevoSupermercado.latitud}
                    onChange={(e) => setNuevoSupermercado({ ...nuevoSupermercado, latitud: e.target.value })}
                    placeholder="4.6097"
                  />
                </div>
                <div>
                  <Label htmlFor="longitud">Longitud (opcional)</Label>
                  <Input
                    id="longitud"
                    type="number"
                    step="any"
                    value={nuevoSupermercado.longitud}
                    onChange={(e) => setNuevoSupermercado({ ...nuevoSupermercado, longitud: e.target.value })}
                    placeholder="-74.0817"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={obtenerUbicacionActual}
                className="w-full"
                data-location-btn
              >
                <MapPin className="h-4 w-4 mr-2" />
                Usar mi ubicación actual
              </Button>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={cerrarDialogo}>
                Cancelar
              </Button>
              <Button onClick={supermercadoEditando ? editarSupermercado : agregarSupermercado}>
                {supermercadoEditando ? "Guardar Cambios" : "Añadir Supermercado"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de supermercados */}
      <Card>
        <CardHeader>
          <CardTitle>Supermercados Registrados</CardTitle>
          <CardDescription>
            {supermercados.length} supermercado{supermercados.length !== 1 ? "s" : ""} registrado
            {supermercados.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supermercados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-6xl mb-4">🏪</div>
              <p className="text-lg font-medium">No hay supermercados registrados</p>
              <p className="text-sm">¡Comienza agregando tu primer supermercado!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supermercados.map((supermercado) => (
                    <TableRow key={supermercado.id}>
                      <TableCell className="font-medium">{supermercado.nombre}</TableCell>
                      <TableCell>{supermercado.direccion || "Sin especificar"}</TableCell>
                      <TableCell>
                        {supermercado.latitud && supermercado.longitud ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {supermercado.latitud.toFixed(4)}, {supermercado.longitud.toFixed(4)}
                            </span>
                          </div>
                        ) : (
                          "Sin ubicación"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => abrirDialogoEdicion(supermercado)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => eliminarSupermercado(supermercado.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
