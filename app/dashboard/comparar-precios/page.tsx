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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, BarChart3, TrendingDown, TrendingUp, Award, Search } from "lucide-react"
import type { Producto, PrecioProducto, Supermercado } from "@/types/database"

const categorias = ["Alimentación", "Transporte", "Entretenimiento", "Salud", "Ropa", "Hogar", "Tecnología", "Otros"]

interface ProductoComparacion {
  producto: Producto
  precios: (PrecioProducto & { supermercado: Supermercado })[]
  mejorPrecio: PrecioProducto & { supermercado: Supermercado }
  peorPrecio: PrecioProducto & { supermercado: Supermercado }
  ahorroMaximo: number
  porcentajeAhorro: number
}

interface EstadisticasCategoria {
  categoria: string
  productos: number
  ahorroPromedio: number
  mejorSupermercado: string
  productosComparables: number
}

export default function CompararPreciosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [supermercados, setSupermercados] = useState<Supermercado[]>([])
  const [precios, setPrecios] = useState<PrecioProducto[]>([])
  const [comparaciones, setComparaciones] = useState<ProductoComparacion[]>([])
  const [estadisticasCategorias, setEstadisticasCategorias] = useState<EstadisticasCategoria[]>([])

  const [dialogoProducto, setDialogoProducto] = useState(false)
  const [dialogoPrecio, setDialogoPrecio] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas")

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    categoria: "Alimentación",
  })
  const [nuevoPrecio, setNuevoPrecio] = useState({
    producto_id: "",
    supermercado_id: "",
    precio: "",
  })

  const supabase = createClient()

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (productos.length > 0 && precios.length > 0) {
      procesarComparaciones()
    }
  }, [productos, precios, supermercados])

  const cargarDatos = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Cargar productos
      const { data: productosData } = await supabase
        .from("productos")
        .select("*")
        .eq("user_id", user.id)
        .order("categoria", { ascending: true })
        .order("nombre", { ascending: true })

      // Cargar supermercados
      const { data: supermercadosData } = await supabase
        .from("supermercados")
        .select("*")
        .eq("user_id", user.id)
        .order("nombre")

      // Cargar precios con relaciones
      const { data: preciosData } = await supabase
        .from("precios_productos")
        .select(`
          *,
          producto:productos(*),
          supermercado:supermercados(*)
        `)
        .order("fecha_actualizacion", { ascending: false })

      setProductos(productosData || [])
      setSupermercados(supermercadosData || [])
      setPrecios(preciosData || [])
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const procesarComparaciones = () => {
    const comparacionesMap = new Map<string, ProductoComparacion>()

    // Agrupar precios por producto
    productos.forEach((producto) => {
      const preciosProducto = precios.filter((p) => p.producto_id === producto.id)

      if (preciosProducto.length >= 2) {
        // Solo productos con al menos 2 precios
        const preciosOrdenados = preciosProducto.sort((a, b) => a.precio - b.precio)
        const mejorPrecio = preciosOrdenados[0]
        const peorPrecio = preciosOrdenados[preciosOrdenados.length - 1]
        const ahorroMaximo = peorPrecio.precio - mejorPrecio.precio
        const porcentajeAhorro = (ahorroMaximo / peorPrecio.precio) * 100

        comparacionesMap.set(producto.id, {
          producto,
          precios: preciosProducto,
          mejorPrecio,
          peorPrecio,
          ahorroMaximo,
          porcentajeAhorro,
        })
      }
    })

    const comparacionesArray = Array.from(comparacionesMap.values())
    setComparaciones(comparacionesArray)

    // Calcular estadísticas por categoría
    const estadisticas = calcularEstadisticasCategorias(comparacionesArray)
    setEstadisticasCategorias(estadisticas)
  }

  const calcularEstadisticasCategorias = (comparaciones: ProductoComparacion[]): EstadisticasCategoria[] => {
    const categoriaStats = new Map<
      string,
      {
        productos: number
        ahorroTotal: number
        supermercadosCount: Map<string, number>
        productosComparables: number
      }
    >()

    comparaciones.forEach((comp) => {
      const categoria = comp.producto.categoria
      if (!categoriaStats.has(categoria)) {
        categoriaStats.set(categoria, {
          productos: 0,
          ahorroTotal: 0,
          supermercadosCount: new Map(),
          productosComparables: 0,
        })
      }

      const stats = categoriaStats.get(categoria)!
      stats.productos++
      stats.ahorroTotal += comp.ahorroMaximo
      stats.productosComparables++

      // Contar cuántas veces cada supermercado tiene el mejor precio
      const mejorSuper = comp.mejorPrecio.supermercado?.nombre || "Desconocido"
      stats.supermercadosCount.set(mejorSuper, (stats.supermercadosCount.get(mejorSuper) || 0) + 1)
    })

    return Array.from(categoriaStats.entries())
      .map(([categoria, stats]) => {
        const mejorSupermercado =
          Array.from(stats.supermercadosCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"

        return {
          categoria,
          productos: stats.productos,
          ahorroPromedio: stats.productos > 0 ? stats.ahorroTotal / stats.productos : 0,
          mejorSupermercado,
          productosComparables: stats.productosComparables,
        }
      })
      .sort((a, b) => b.ahorroPromedio - a.ahorroPromedio)
  }

  const agregarProducto = async () => {
    if (!nuevoProducto.nombre.trim()) {
      alert("El nombre del producto es obligatorio.")
      return
    }

    if (!nuevoProducto.categoria) {
      alert("La categoría es obligatoria.")
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        alert("Error: Usuario no autenticado")
        return
      }

      // Verificar si el producto ya existe
      const { data: productoExistente } = await supabase
        .from("productos")
        .select("id")
        .eq("user_id", user.id)
        .eq("nombre", nuevoProducto.nombre.trim())
        .eq("categoria", nuevoProducto.categoria)
        .single()

      if (productoExistente) {
        alert("Ya existe un producto con este nombre en la misma categoría.")
        return
      }

      const producto = {
        user_id: user.id,
        nombre: nuevoProducto.nombre.trim(),
        categoria: nuevoProducto.categoria,
      }

      const { data, error } = await supabase.from("productos").insert(producto).select()

      if (error) {
        console.error("Error de Supabase:", error)
        alert(`Error al agregar producto: ${error.message}`)
        return
      }

      if (data && data[0]) {
        setProductos([...productos, data[0]])
        alert("¡Producto agregado exitosamente!")
      }

      setNuevoProducto({ nombre: "", categoria: "Alimentación" })
      setDialogoProducto(false)
    } catch (error) {
      console.error("Error agregando producto:", error)
      alert("Error inesperado al agregar el producto. Por favor intenta nuevamente.")
    }
  }

  const agregarPrecio = async () => {
    if (!nuevoPrecio.producto_id) {
      alert("Debes seleccionar un producto.")
      return
    }

    if (!nuevoPrecio.supermercado_id) {
      alert("Debes seleccionar un supermercado.")
      return
    }

    if (!nuevoPrecio.precio || Number.parseFloat(nuevoPrecio.precio) <= 0) {
      alert("El precio debe ser mayor a 0.")
      return
    }

    try {
      // Verificar si ya existe un precio para este producto en este supermercado
      const { data: precioExistente } = await supabase
        .from("precios_productos")
        .select("id")
        .eq("producto_id", nuevoPrecio.producto_id)
        .eq("supermercado_id", nuevoPrecio.supermercado_id)
        .single()

      if (precioExistente) {
        const confirmar = confirm("Ya existe un precio para este producto en este supermercado. ¿Deseas actualizarlo?")
        if (!confirmar) return

        // Actualizar precio existente
        const { error: updateError } = await supabase
          .from("precios_productos")
          .update({
            precio: Number.parseFloat(nuevoPrecio.precio),
            fecha_actualizacion: new Date().toISOString().split("T")[0],
          })
          .eq("id", precioExistente.id)

        if (updateError) {
          alert(`Error al actualizar precio: ${updateError.message}`)
          return
        }

        alert("¡Precio actualizado exitosamente!")
        await cargarDatos() // Recargar datos
      } else {
        // Crear nuevo precio
        const precio = {
          producto_id: nuevoPrecio.producto_id,
          supermercado_id: nuevoPrecio.supermercado_id,
          precio: Number.parseFloat(nuevoPrecio.precio),
          fecha_actualizacion: new Date().toISOString().split("T")[0],
        }

        const { data, error } = await supabase
          .from("precios_productos")
          .insert(precio)
          .select(`
            *,
            producto:productos(*),
            supermercado:supermercados(*)
          `)

        if (error) {
          console.error("Error de Supabase:", error)
          alert(`Error al agregar precio: ${error.message}`)
          return
        }

        if (data && data[0]) {
          setPrecios([data[0], ...precios])
          alert("¡Precio agregado exitosamente!")
        }
      }

      setNuevoPrecio({ producto_id: "", supermercado_id: "", precio: "" })
      setDialogoPrecio(false)
    } catch (error) {
      console.error("Error agregando precio:", error)
      alert("Error inesperado al agregar el precio. Por favor intenta nuevamente.")
    }
  }

  // Filtrar comparaciones
  const comparacionesFiltradas = comparaciones.filter((comp) => {
    const coincideBusqueda = comp.producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = categoriaFiltro === "todas" || comp.producto.categoria === categoriaFiltro
    return coincideBusqueda && coincideCategoria
  })

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
          <BarChart3 className="h-8 w-8" />
          Comparar Precios entre Supermercados
        </h1>
        <p className="text-gray-600">Encuentra los mejores precios y ahorra en tus compras</p>
      </div>

      {/* Estadísticas por Categoría */}
      {estadisticasCategorias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Ahorros por Categoría</CardTitle>
            <CardDescription>Categorías con mayor potencial de ahorro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {estadisticasCategorias.slice(0, 6).map((stat) => (
                <div key={stat.categoria} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{stat.categoria}</h4>
                    <Badge variant="secondary">{stat.productosComparables} productos</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-600">
                      ${Math.round(stat.ahorroPromedio).toLocaleString("es-CO")} COP
                    </p>
                    <p className="text-sm text-gray-600">Ahorro promedio</p>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{stat.mejorSupermercado}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros y Acciones</CardTitle>
          <CardDescription>Busca productos y gestiona precios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar productos..."
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
            <div className="flex gap-2">
              <Dialog open={dialogoProducto} onOpenChange={setDialogoProducto}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Producto
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Añadir Nuevo Producto</DialogTitle>
                    <DialogDescription>Agrega un producto para comparar precios</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nombre-producto">Nombre del producto</Label>
                      <Input
                        id="nombre-producto"
                        value={nuevoProducto.nombre}
                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                        placeholder="Ej: Leche entera 1L"
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoria-producto">Categoría</Label>
                      <Select
                        value={nuevoProducto.categoria}
                        onValueChange={(value) => setNuevoProducto({ ...nuevoProducto, categoria: value })}
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
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDialogoProducto(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={agregarProducto}>Añadir Producto</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogoPrecio} onOpenChange={setDialogoPrecio}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Precio
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Añadir Precio</DialogTitle>
                    <DialogDescription>Registra el precio de un producto en un supermercado</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="producto">Producto</Label>
                      <Select
                        value={nuevoPrecio.producto_id}
                        onValueChange={(value) => setNuevoPrecio({ ...nuevoPrecio, producto_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((producto) => (
                            <SelectItem key={producto.id} value={producto.id}>
                              {producto.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="supermercado">Supermercado</Label>
                      <Select
                        value={nuevoPrecio.supermercado_id}
                        onValueChange={(value) => setNuevoPrecio({ ...nuevoPrecio, supermercado_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un supermercado" />
                        </SelectTrigger>
                        <SelectContent>
                          {supermercados.map((supermercado) => (
                            <SelectItem key={supermercado.id} value={supermercado.id}>
                              {supermercado.nombre}
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
                        value={nuevoPrecio.precio}
                        onChange={(e) => setNuevoPrecio({ ...nuevoPrecio, precio: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDialogoPrecio(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={agregarPrecio}>Añadir Precio</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparaciones de Productos */}
      {comparacionesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-lg font-medium">No hay productos para comparar</p>
            <p className="text-sm text-gray-600">
              Necesitas al menos 2 precios por producto en diferentes supermercados para hacer comparaciones
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comparacionesFiltradas.map((comparacion) => (
            <Card key={comparacion.producto.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{comparacion.producto.nombre}</span>
                    <Badge variant="secondary">{comparacion.producto.categoria}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingDown className="h-5 w-5" />
                    <span className="font-bold">Ahorra ${comparacion.ahorroMaximo.toLocaleString("es-CO")} COP</span>
                    <span className="text-sm">({comparacion.porcentajeAhorro.toFixed(1)}%)</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supermercado</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Diferencia vs mejor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Última actualización</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparacion.precios
                        .sort((a, b) => a.precio - b.precio)
                        .map((precio, index) => {
                          const diferencia = precio.precio - comparacion.mejorPrecio.precio
                          const esMejor = precio.id === comparacion.mejorPrecio.id
                          const esPeor = precio.id === comparacion.peorPrecio.id

                          return (
                            <TableRow key={precio.id} className={esMejor ? "bg-green-50" : esPeor ? "bg-red-50" : ""}>
                              <TableCell className="font-medium">{precio.supermercado?.nombre}</TableCell>
                              <TableCell className="font-semibold">
                                ${precio.precio.toLocaleString("es-CO")} COP
                              </TableCell>
                              <TableCell>
                                {diferencia === 0 ? (
                                  <span className="text-green-600 font-medium">Mejor precio</span>
                                ) : (
                                  <span className="text-red-600">+${diferencia.toLocaleString("es-CO")} COP</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {esMejor && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Award className="h-4 w-4" />
                                    <span className="font-medium">Mejor precio</span>
                                  </div>
                                )}
                                {esPeor && comparacion.precios.length > 2 && (
                                  <div className="flex items-center gap-1 text-red-600">
                                    <TrendingUp className="h-4 w-4" />
                                    <span>Más caro</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {new Date(precio.fecha_actualizacion).toLocaleDateString("es-CO")}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
