"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit3, Trash2, CalendarDays } from "lucide-react"
import type { Compra, Supermercado } from "@/types/database"

const categorias = ["Alimentación", "Transporte", "Entretenimiento", "Salud", "Ropa", "Hogar", "Tecnología", "Otros"]

const coloresCategorias: { [key: string]: string } = {
  Alimentación: "bg-green-100 text-green-800",
  Transporte: "bg-blue-100 text-blue-800",
  Entretenimiento: "bg-purple-100 text-purple-800",
  Salud: "bg-red-100 text-red-800",
  Ropa: "bg-pink-100 text-pink-800",
  Hogar: "bg-yellow-100 text-yellow-800",
  Tecnología: "bg-gray-100 text-gray-800",
  Otros: "bg-orange-100 text-orange-800",
}

export default function DashboardPage() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [supermercados, setSupermercados] = useState<Supermercado[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas")
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [compraEditando, setCompraEditando] = useState<Compra | null>(null)
  const [loading, setLoading] = useState(true)
  const [nuevaCompra, setNuevaCompra] = useState({
    nombre: "",
    categoria: "Alimentación",
    precio: "",
    fecha: "",
    supermercado_id: null,
  })

  const supabase = createClient()
  const fechaActual = new Date()
  const mesActual = fechaActual.getMonth() + 1
  const añoActual = fechaActual.getFullYear()
  const fechaHoy = fechaActual.toISOString().split("T")[0]

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Cargar compras del mes actual
      const { data: comprasData } = await supabase
        .from("compras")
        .select(`
          *,
          supermercado:supermercados(*)
        `)
        .eq("user_id", user.id)
        .eq("mes", mesActual)
        .eq("año", añoActual)
        .order("fecha", { ascending: false })

      // Cargar supermercados
      const { data: supermercadosData } = await supabase
        .from("supermercados")
        .select("*")
        .eq("user_id", user.id)
        .order("nombre")

      setCompras(comprasData || [])
      setSupermercados(supermercadosData || [])
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const comprasFiltradas = compras.filter((compra) => {
    const coincideBusqueda =
      compra.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (compra.supermercado?.nombre || "").toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = categoriaFiltro === "todas" || compra.categoria === categoriaFiltro
    return coincideBusqueda && coincideCategoria
  })

  // Calcular totales usando todas las compras, no solo las filtradas
  const totalMes = compras.reduce((total, compra) => total + compra.precio, 0)
  const totalHoy = compras
    .filter((compra) => compra.fecha === fechaHoy)
    .reduce((total, compra) => total + compra.precio, 0)

  const agregarCompra = async () => {
    if (nuevaCompra.nombre && nuevaCompra.categoria && nuevaCompra.precio && nuevaCompra.fecha) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const fechaCompra = new Date(nuevaCompra.fecha)
        const compra = {
          user_id: user.id,
          nombre: nuevaCompra.nombre,
          categoria: nuevaCompra.categoria,
          precio: Number.parseFloat(nuevaCompra.precio),
          fecha: nuevaCompra.fecha,
          supermercado_id: nuevaCompra.supermercado_id,
          mes: fechaCompra.getMonth() + 1,
          año: fechaCompra.getFullYear(),
        }

        const { data, error } = await supabase
          .from("compras")
          .insert(compra)
          .select(`
            *,
            supermercado:supermercados(*)
          `)

        if (error) throw error

        if (data && data[0]) {
          const nuevasCompras = [data[0], ...compras]
          setCompras(nuevasCompras)
        }

        setNuevaCompra({ nombre: "", categoria: "Alimentación", precio: "", fecha: "", supermercado_id: null })
        setDialogoAbierto(false)
      } catch (error) {
        console.error("Error agregando compra:", error)
      }
    }
  }

  const editarCompra = async () => {
    if (compraEditando && nuevaCompra.nombre && nuevaCompra.categoria && nuevaCompra.precio && nuevaCompra.fecha) {
      try {
        const fechaCompra = new Date(nuevaCompra.fecha)
        const compraActualizada = {
          nombre: nuevaCompra.nombre,
          categoria: nuevaCompra.categoria,
          precio: Number.parseFloat(nuevaCompra.precio),
          fecha: nuevaCompra.fecha,
          supermercado_id: nuevaCompra.supermercado_id,
          mes: fechaCompra.getMonth() + 1,
          año: fechaCompra.getFullYear(),
        }

        const { error } = await supabase.from("compras").update(compraActualizada).eq("id", compraEditando.id)

        if (error) throw error

        await cargarDatos()
        setCompraEditando(null)
        setNuevaCompra({ nombre: "", categoria: "Alimentación", precio: "", fecha: "", supermercado_id: null })
        setDialogoAbierto(false)
      } catch (error) {
        console.error("Error editando compra:", error)
      }
    }
  }

  const eliminarCompra = async (id: string) => {
    try {
      const { error } = await supabase.from("compras").delete().eq("id", id)

      if (error) throw error

      setCompras(compras.filter((compra) => compra.id !== id))
    } catch (error) {
      console.error("Error eliminando compra:", error)
    }
  }

  const abrirDialogoEdicion = (compra: Compra) => {
    setCompraEditando(compra)
    setNuevaCompra({
      nombre: compra.nombre,
      categoria: compra.categoria,
      precio: compra.precio.toString(),
      fecha: compra.fecha,
      supermercado_id: compra.supermercado_id || null,
    })
    setDialogoAbierto(true)
  }

  const cerrarDialogo = () => {
    setDialogoAbierto(false)
    setCompraEditando(null)
    setNuevaCompra({ nombre: "", categoria: "Alimentación", precio: "", fecha: "", supermercado_id: null })
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
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Compras de {new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
        </h1>
        <p className="text-gray-600">Controla y organiza todos tus gastos del mes</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalHoy.toLocaleString("es-CO")} COP</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalMes.toLocaleString("es-CO")} COP</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Número de Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{comprasFiltradas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Promedio por Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              $
              {comprasFiltradas.length > 0
                ? Math.round(totalMes / comprasFiltradas.length).toLocaleString("es-CO")
                : "0"}{" "}
              COP
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros y Acciones</CardTitle>
          <CardDescription>Busca y filtra tus compras, o añade una nueva</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o supermercado..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria} value={categoria}>
                    {categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
              <DialogTrigger asChild>
                <Button onClick={() => setDialogoAbierto(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Compra
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{compraEditando ? "Editar Compra" : "Añadir Nueva Compra"}</DialogTitle>
                  <DialogDescription>
                    {compraEditando ? "Modifica los datos de la compra" : "Completa los datos de tu nueva compra"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre de la compra</Label>
                    <Input
                      id="nombre"
                      value={nuevaCompra.nombre}
                      onChange={(e) => setNuevaCompra({ ...nuevaCompra, nombre: e.target.value })}
                      placeholder="Ej: Compra semanal"
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoria">Categoría</Label>
                    <Select
                      value={nuevaCompra.categoria}
                      onValueChange={(value) => setNuevaCompra({ ...nuevaCompra, categoria: value })}
                    >
                      <SelectTrigger>
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
                  <div>
                    <Label htmlFor="precio">Precio (COP)</Label>
                    <Input
                      id="precio"
                      type="number"
                      step="1"
                      value={nuevaCompra.precio}
                      onChange={(e) => setNuevaCompra({ ...nuevaCompra, precio: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={nuevaCompra.fecha}
                      onChange={(e) => setNuevaCompra({ ...nuevaCompra, fecha: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supermercado">Supermercado (opcional)</Label>
                    <Select
                      value={nuevaCompra.supermercado_id || "sin_supermercado"}
                      onValueChange={(value) =>
                        setNuevaCompra({ ...nuevaCompra, supermercado_id: value === "sin_supermercado" ? null : value })
                      }
                    >
                      <SelectTrigger>
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
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={cerrarDialogo}>
                    Cancelar
                  </Button>
                  <Button onClick={compraEditando ? editarCompra : agregarCompra}>
                    {compraEditando ? "Guardar Cambios" : "Añadir Compra"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Compras */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Compras</CardTitle>
          <CardDescription>
            {comprasFiltradas.length} compra{comprasFiltradas.length !== 1 ? "s" : ""} encontrada
            {comprasFiltradas.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {comprasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-lg font-medium">No hay compras este mes</p>
              <p className="text-sm">¡Comienza agregando tu primera compra del mes!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Supermercado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprasFiltradas.map((compra) => (
                    <TableRow key={compra.id}>
                      <TableCell className="font-medium">{compra.nombre}</TableCell>
                      <TableCell>
                        <Badge className={coloresCategorias[compra.categoria] || "bg-gray-100 text-gray-800"}>
                          {compra.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">${compra.precio.toLocaleString("es-CO")} COP</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4 text-gray-400" />
                          {new Date(compra.fecha).toLocaleDateString("es-CO")}
                        </div>
                      </TableCell>
                      <TableCell>{compra.supermercado?.nombre || "Sin especificar"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
