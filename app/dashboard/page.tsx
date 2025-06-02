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
import { Plus, Search, Edit3, Trash2, CalendarDays, Package, Filter } from "lucide-react"
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
    cantidad: "1",
    fecha: new Date().toISOString().split("T")[0], // "2025-06-01"
    supermercado_id: null as string | null,
  })
  const [error, setError] = useState("")

  const supabase = createClient()
  const fechaActual = new Date()
  const mesActual = fechaActual.getMonth() + 1 // 6 (junio)
  const añoActual = fechaActual.getFullYear() // 2025
  const fechaHoy = fechaActual.toISOString().split("T")[0] // "2025-06-01"

  // Función para normalizar fechas a YYYY-MM-DD
  const normalizarFecha = (fecha: string | Date): string => {
    if (typeof fecha === "string") {
      return fecha.split("T")[0]
    }
    return fecha.toISOString().split("T")[0]
  }

  // Función para parsear fecha manualmente y evitar problemas de zona horaria
  const parsearFechaLocal = (fechaStr: string): Date => {
    const [año, mes, dia] = fechaStr.split("-").map(Number)
    // Crear la fecha en la zona horaria local sin ajuste de UTC
    const fecha = new Date(año, mes - 1, dia)
    console.log("Fecha parseada manualmente:", fechaStr, "Resultado:", fecha.toString())
    return fecha
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("Usuario no autenticado")
        return
      }

      const { data: comprasData, error: comprasError } = await supabase
        .from("compras")
        .select(`
          *,
          supermercado:supermercados(*)
        `)
        .eq("user_id", user.id)
        .eq("mes", mesActual)
        .eq("año", añoActual)
        .order("fecha", { ascending: false })

      if (comprasError) {
        console.error("Error al cargar compras:", comprasError)
        setError("Error al cargar las compras")
        return
      }

      const { data: supermercadosData, error: supermercadosError } = await supabase
        .from("supermercados")
        .select("*")
        .eq("user_id", user.id)
        .order("nombre")

      if (supermercadosError) {
        console.error("Error al cargar supermercados:", supermercadosError)
        setError("Error al cargar los supermercados")
        return
      }

      console.log("Compras cargadas:", comprasData)
      const comprasNormalizadas = comprasData?.map(compra => ({
        ...compra,
        fecha: normalizarFecha(compra.fecha),
      })) || []
      setCompras(comprasNormalizadas)
      setSupermercados(supermercadosData || [])
    } catch (error) {
      console.error("Error cargando datos:", error)
      setError("Error inesperado al cargar los datos")
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

  const totalMes = compras.reduce((total, compra) => total + compra.precio * compra.cantidad, 0)
  const totalHoy = compras
    .filter((compra) => normalizarFecha(compra.fecha) === fechaHoy)
    .reduce((total, compra) => total + compra.precio * compra.cantidad, 0)

  const agregarCompra = async () => {
    setError("")

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

    // Parsear la fecha manualmente para evitar problemas de zona horaria
    const fechaCompra = parsearFechaLocal(nuevaCompra.fecha)
    if (isNaN(fechaCompra.getTime())) {
      setError("La fecha es inválida")
      return
    }

    const mes = fechaCompra.getMonth() + 1
    const año = fechaCompra.getFullYear()

    console.log("Fecha ingresada:", nuevaCompra.fecha, "Mes calculado:", mes, "Año calculado:", año)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("Usuario no autenticado")
        return
      }

      const compra = {
        user_id: user.id,
        nombre: nuevaCompra.nombre.trim(),
        categoria: nuevaCompra.categoria,
        precio,
        cantidad,
        fecha: nuevaCompra.fecha,
        supermercado_id: nuevaCompra.supermercado_id,
        mes,
        año,
      }

      console.log("Insertando compra:", compra)

      const { data, error: supabaseError } = await supabase
        .from("compras")
        .insert(compra)
        .select(`
          *,
          supermercado:supermercados(*)
        `)
        .single()

      if (supabaseError) {
        console.error("Error de Supabase al insertar:", supabaseError)
        setError(`Error al guardar: ${supabaseError.message}`)
        return
      }

      if (data) {
        data.fecha = normalizarFecha(data.fecha)
      }

      if (data && data.mes === mesActual && data.año === añoActual) {
        setCompras([data, ...compras])
      }

      setNuevaCompra({
        nombre: "",
        categoria: "Alimentación",
        precio: "",
        cantidad: "1",
        fecha: fechaHoy,
        supermercado_id: null,
      })
      setDialogoAbierto(false)
    } catch (error) {
      console.error("Error agregando compra:", error)
      setError("Error inesperado al agregar la compra")
    }
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

    console.log("Fecha editada:", nuevaCompra.fecha, "Mes calculado:", mes, "Año calculado:", año)

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

      console.log("Actualizando compra:", compraActualizada)

      const { error: supabaseError } = await supabase
        .from("compras")
        .update(compraActualizada)
        .eq("id", compraEditando.id)

      if (supabaseError) {
        console.error("Error de Supabase al actualizar:", supabaseError)
        setError(`Error al guardar: ${supabaseError.message}`)
        return
      }

      await cargarDatos()
      cerrarDialogo()
    } catch (error) {
      console.error("Error editando compra:", error)
      setError("Error inesperado al editar la compra")
    }
  }

  const eliminarCompra = async (id: string) => {
    try {
      const { error: supabaseError } = await supabase.from("compras").delete().eq("id", id)

      if (supabaseError) {
        console.error("Error de Supabase al eliminar:", supabaseError)
        setError(`Error al eliminar: ${supabaseError.message}`)
        return
      }

      setCompras(compras.filter((compra) => compra.id !== id))
    } catch (error) {
      console.error("Error eliminando compra:", error)
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
      fecha: fechaHoy,
      supermercado_id: null,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Compras de {new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
        </h1>
        <p className="text-sm sm:text-base text-gray-600">Controla y organiza todos tus gastos del mes</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              ${totalHoy.toLocaleString("es-CO")}
              <span className="text-xs sm:text-sm font-normal text-gray-500 block">COP</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              ${totalMes.toLocaleString("es-CO")}
              <span className="text-xs sm:text-sm font-normal text-gray-500 block">COP</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Número de Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-purple-600">{comprasFiltradas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Promedio por Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-orange-600">
              $
              {comprasFiltradas.length > 0
                ? Math.round(totalMes / comprasFiltradas.length).toLocaleString("es-CO")
                : "0"}
              <span className="text-xs sm:text-sm font-normal text-gray-500 block">COP</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Filtros y Acciones</CardTitle>
          <CardDescription className="text-sm">Busca y filtra tus compras, o añade una nueva</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4">
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
            <div className="flex gap-2">
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoría" />
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
                  <Button onClick={() => setDialogoAbierto(true)} className="shrink-0">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nueva Compra</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg">
                      {compraEditando ? "Editar Compra" : "Añadir Nueva Compra"}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      {compraEditando ? "Modifica los datos de la compra" : "Completa los datos de tu nueva compra"}
                    </DialogDescription>
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
                        max={fechaHoy}
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
                    <Button onClick={compraEditando ? editarCompra : agregarCompra} className="w-full sm:w-auto">
                      {compraEditando ? "Guardar Cambios" : "Añadir Compra"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Lista de Compras</CardTitle>
          <CardDescription className="text-sm">
            {comprasFiltradas.length} compra{comprasFiltradas.length !== 1 ? "s" : ""} encontrada
            {comprasFiltradas.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {comprasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl sm:text-6xl mb-4">🛒</div>
              <p className="text-base sm:text-lg font-medium">No hay compras este mes</p>
              <p className="text-sm">¡Comienza agregando tu primera compra del mes!</p>
            </div>
          ) : (
            <>
              <div className="block sm:hidden space-y-3">
                {comprasFiltradas.map((compra) => (
                  <Card key={compra.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{compra.nombre}</h4>
                        <Badge
                          className={`${coloresCategorias[compra.categoria] || "bg-gray-100 text-gray-800"} text-xs mt-1`}
                        >
                          {compra.categoria}
                        </Badge>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="outline" size="sm" onClick={() => abrirDialogoEdicion(compra)}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => eliminarCompra(compra.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Precio unitario:</span>
                        <span>${compra.precio.toLocaleString("es-CO")} COP</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cantidad:</span>
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {compra.cantidad}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-green-600">
                        <span>Total:</span>
                        <span>${(compra.precio * compra.cantidad).toLocaleString("es-CO")} COP</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fecha:</span>
                        <span>{new Date(compra.fecha).toLocaleDateString("es-CO")}</span>
                      </div>
                      {compra.supermercado && (
                        <div className="flex justify-between">
                          <span>Supermercado:</span>
                          <span>{compra.supermercado.nombre}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Total</TableHead>
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
                        <TableCell>${compra.precio.toLocaleString("es-CO")} COP</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-gray-400" />
                            {compra.cantidad}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ${(compra.precio * compra.cantidad).toLocaleString("es-CO")} COP
                        </TableCell>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}