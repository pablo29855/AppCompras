"use client"

import { useState } from "react"
import { CalendarDays, Plus, Search, Trash2, Edit3, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Compra {
  id: number
  nombre: string
  categoria: string
  precio: number
  fecha: string
  tienda: string
}

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

export default function Component() {
  const [compras, setCompras] = useState<Compra[]>([
    {
      id: 1,
      nombre: "Compra semanal",
      categoria: "Alimentación",
      precio: 85.5,
      fecha: "2024-01-15",
      tienda: "Mercadona",
    },
    {
      id: 2,
      nombre: "Gasolina",
      categoria: "Transporte",
      precio: 60.0,
      fecha: "2024-01-14",
      tienda: "Repsol",
    },
    {
      id: 3,
      nombre: "Cine",
      categoria: "Entretenimiento",
      precio: 12.5,
      fecha: "2024-01-13",
      tienda: "Cinesa",
    },
  ])

  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas")
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [compraEditando, setCompraEditando] = useState<Compra | null>(null)
  const [nuevaCompra, setNuevaCompra] = useState({
    nombre: "",
    categoria: "",
    precio: "",
    fecha: "",
    tienda: "",
  })

  const comprasFiltradas = compras.filter((compra) => {
    const coincideBusqueda =
      compra.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      compra.tienda.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = categoriaFiltro === "todas" || compra.categoria === categoriaFiltro
    return coincideBusqueda && coincideCategoria
  })

  const totalGastado = comprasFiltradas.reduce((total, compra) => total + compra.precio, 0)

  const agregarCompra = () => {
    if (nuevaCompra.nombre && nuevaCompra.categoria && nuevaCompra.precio && nuevaCompra.fecha) {
      const compra: Compra = {
        id: Date.now(),
        nombre: nuevaCompra.nombre,
        categoria: nuevaCompra.categoria,
        precio: Number.parseFloat(nuevaCompra.precio),
        fecha: nuevaCompra.fecha,
        tienda: nuevaCompra.tienda,
      }
      setCompras([...compras, compra])
      setNuevaCompra({ nombre: "", categoria: "", precio: "", fecha: "", tienda: "" })
      setDialogoAbierto(false)
    }
  }

  const editarCompra = () => {
    if (compraEditando && nuevaCompra.nombre && nuevaCompra.categoria && nuevaCompra.precio && nuevaCompra.fecha) {
      const comprasActualizadas = compras.map((compra) =>
        compra.id === compraEditando.id
          ? {
              ...compra,
              nombre: nuevaCompra.nombre,
              categoria: nuevaCompra.categoria,
              precio: Number.parseFloat(nuevaCompra.precio),
              fecha: nuevaCompra.fecha,
              tienda: nuevaCompra.tienda,
            }
          : compra,
      )
      setCompras(comprasActualizadas)
      setCompraEditando(null)
      setNuevaCompra({ nombre: "", categoria: "", precio: "", fecha: "", tienda: "" })
      setDialogoAbierto(false)
    }
  }

  const eliminarCompra = (id: number) => {
    setCompras(compras.filter((compra) => compra.id !== id))
  }

  const abrirDialogoEdicion = (compra: Compra) => {
    setCompraEditando(compra)
    setNuevaCompra({
      nombre: compra.nombre,
      categoria: compra.categoria,
      precio: compra.precio.toString(),
      fecha: compra.fecha,
      tienda: compra.tienda,
    })
    setDialogoAbierto(true)
  }

  const cerrarDialogo = () => {
    setDialogoAbierto(false)
    setCompraEditando(null)
    setNuevaCompra({ nombre: "", categoria: "", precio: "", fecha: "", tienda: "" })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Gestión de Compras Mensuales
          </h1>
          <p className="text-gray-600">Controla y organiza todos tus gastos del mes</p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Gastado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">€{totalGastado.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Número de Compras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{comprasFiltradas.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Promedio por Compra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                €{comprasFiltradas.length > 0 ? (totalGastado / comprasFiltradas.length).toFixed(2) : "0.00"}
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
                    placeholder="Buscar por nombre o tienda..."
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
                      <Label htmlFor="precio">Precio (€)</Label>
                      <Input
                        id="precio"
                        type="number"
                        step="0.01"
                        value={nuevaCompra.precio}
                        onChange={(e) => setNuevaCompra({ ...nuevaCompra, precio: e.target.value })}
                        placeholder="0.00"
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
                      <Label htmlFor="tienda">Tienda</Label>
                      <Input
                        id="tienda"
                        value={nuevaCompra.tienda}
                        onChange={(e) => setNuevaCompra({ ...nuevaCompra, tienda: e.target.value })}
                        placeholder="Ej: Mercadona"
                      />
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
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron compras</p>
                <p className="text-sm">Prueba a cambiar los filtros o añade una nueva compra</p>
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
                      <TableHead>Tienda</TableHead>
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
                        <TableCell className="font-semibold">€{compra.precio.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            {new Date(compra.fecha).toLocaleDateString("es-ES")}
                          </div>
                        </TableCell>
                        <TableCell>{compra.tienda}</TableCell>
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
    </div>
  )
}
