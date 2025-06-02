"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Award, Search, ChevronDown, ChevronUp } from "lucide-react"
import type { Producto, Compra, DetalleCompra, Supermercado } from "@/types/database"

const categorias = ["Alimentación", "Transporte", "Entretenimiento", "Salud", "Ropa", "Hogar", "Tecnología", "Otros"]

interface ComparacionCategoria {
  categoria: string
  preciosPorSupermercado: {
    supermercado: Supermercado
    precioPromedio: number
    cantidadProductos: number
    totalGastado: number
  }[]
  mejorSupermercado: Supermercado | null
  ahorroPotencial: number
  detallesProductos: {
    producto: Producto
    detalles: { supermercado: Supermercado; precioUnitario: number; cantidad: number; fecha: string }[]
  }[]
}

interface EstadisticasCategoria {
  categoria: string
  totalProductos: number
  ahorroPromedio: number
  mejorSupermercado: string
}

export default function CompararPreciosPage() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [detallesCompras, setDetallesCompras] = useState<DetalleCompra[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [supermercados, setSupermercados] = useState<Supermercado[]>([])
  const [comparaciones, setComparaciones] = useState<ComparacionCategoria[]>([])
  const [estadisticasCategorias, setEstadisticasCategorias] = useState<EstadisticasCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [expandedCategorias, setExpandedCategorias] = useState<Set<string>>(new Set())

  const supabase = createClient()

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (compras.length > 0 && detallesCompras.length > 0 && productos.length > 0 && supermercados.length > 0) {
      procesarComparaciones()
    }
  }, [compras, detallesCompras, productos, supermercados, fechaInicio, fechaFin])

  const cargarDatos = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Cargar supermercados
      const { data: supermercadosData } = await supabase
        .from("supermercados")
        .select("*")
        .eq("user_id", user.id)
        .order("nombre")

      // Cargar productos
      const { data: productosData } = await supabase
        .from("productos")
        .select("*")
        .eq("user_id", user.id)
        .order("categoria")

      // Cargar compras
      const { data: comprasData } = await supabase
        .from("compras")
        .select("*")
        .eq("user_id", user.id)
        .order("fecha", { ascending: false })

      // Cargar detalles de compras
      const { data: detallesData } = await supabase
        .from("detalles_compras")
        .select("*")
        .in(
          "compra_id",
          comprasData?.map((compra) => compra.id) || []
        )

      setSupermercados(supermercadosData || [])
      setProductos(productosData || [])
      setCompras(comprasData || [])
      setDetallesCompras(detallesData || [])
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const procesarComparaciones = () => {
    // Filtrar compras por rango de fechas
    const comprasFiltradas = compras.filter((compra) => {
      const fechaCompra = new Date(compra.fecha).getTime()
      const inicio = fechaInicio ? new Date(fechaInicio).getTime() : -Infinity
      const fin = fechaFin ? new Date(fechaFin).getTime() : Infinity
      return fechaCompra >= inicio && fechaCompra <= fin
    })

    const detallesFiltrados = detallesCompras.filter((detalle) =>
      comprasFiltradas.some((compra) => compra.id === detalle.compra_id)
    )

    // Mapear productos y supermercados para acceso rápido
    const productosMap = new Map(productos.map((p) => [p.id, p]))
    const supermercadosMap = new Map(supermercados.map((s) => [s.id, s]))

    // Agrupar detalles de compras por categoría y supermercado
    const comparacionesMap = new Map<
      string,
      {
        preciosPorSupermercado: Map<
          string,
          { supermercado: Supermercado; totalGastado: number; totalCantidad: number }
        >
        detallesProductos: Map<
          string,
          { producto: Producto; detalles: { supermercado: Supermercado; precioUnitario: number; cantidad: number; fecha: string }[] }
        >
      }
    >()

    detallesFiltrados.forEach((detalle) => {
      const producto = productosMap.get(detalle.producto_id)
      const compra = comprasFiltradas.find((c) => c.id === detalle.compra_id)
      const supermercado = compra ? supermercadosMap.get(compra.supermercado_id) : null

      if (!producto || !supermercado || !compra) return

      const categoria = producto.categoria

      if (!comparacionesMap.has(categoria)) {
        comparacionesMap.set(categoria, {
          preciosPorSupermercado: new Map(),
          detallesProductos: new Map(),
        })
      }

      const categoriaData = comparacionesMap.get(categoria)!
      const totalGastadoDetalle = detalle.precio_unitario * detalle.cantidad

      // Actualizar precios por supermercado
      if (!categoriaData.preciosPorSupermercado.has(supermercado.id)) {
        categoriaData.preciosPorSupermercado.set(supermercado.id, {
          supermercado,
          totalGastado: 0,
          totalCantidad: 0,
        })
      }

      const superData = categoriaData.preciosPorSupermercado.get(supermercado.id)!
      superData.totalGastado += totalGastadoDetalle
      superData.totalCantidad += detalle.cantidad

      // Guardar detalles de productos
      if (!categoriaData.detallesProductos.has(producto.id)) {
        categoriaData.detallesProductos.set(producto.id, {
          producto,
          detalles: [],
        })
      }

      const productoData = categoriaData.detallesProductos.get(producto.id)!
      productoData.detalles.push({
        supermercado,
        precioUnitario: detalle.precio_unitario,
        cantidad: detalle.cantidad,
        fecha: compra.fecha,
      })
    })

    // Calcular precios promedio y comparaciones
    const comparacionesArray: ComparacionCategoria[] = Array.from(comparacionesMap.entries()).map(
      ([categoria, data]) => {
        const preciosPorSuper = Array.from(data.preciosPorSupermercado.entries()).map(([_, superData]) => ({
          supermercado: superData.supermercado,
          precioPromedio:
            superData.totalCantidad > 0 ? superData.totalGastado / superData.totalCantidad : 0,
          cantidadProductos: superData.totalCantidad,
          totalGastado: superData.totalGastado,
        }))

        // Ordenar por precio promedio
        const preciosOrdenados = preciosPorSuper.sort((a, b) => a.precioPromedio - b.precioPromedio)
        const mejorSuper = preciosOrdenados[0]?.supermercado || null
        const ahorroPotencial =
          preciosOrdenados.length > 1
            ? preciosOrdenados[preciosOrdenados.length - 1].precioPromedio - preciosOrdenados[0].precioPromedio
            : 0

        return {
          categoria,
          preciosPorSupermercado: preciosOrdenados,
          mejorSupermercado: mejorSuper,
          ahorroPotencial,
          detallesProductos: Array.from(data.detallesProductos.values()),
        }
      }
    )

    // Filtrar categorías con al menos 2 supermercados para comparar
    const comparacionesFiltradas = comparacionesArray.filter(
      (comp) => comp.preciosPorSupermercado.length >= 2
    )
    setComparaciones(comparacionesFiltradas)

    // Calcular estadísticas por categoría
    const estadisticas = calcularEstadisticasCategorias(comparacionesFiltradas)
    setEstadisticasCategorias(estadisticas)
  }

  const calcularEstadisticasCategorias = (
    comparaciones: ComparacionCategoria[]
  ): EstadisticasCategoria[] => {
    return comparaciones.map((comp) => ({
      categoria: comp.categoria,
      totalProductos: comp.preciosPorSupermercado.reduce(
        (sum, superData) => sum + superData.cantidadProductos,
        0
      ),
      ahorroPromedio: comp.ahorroPotencial,
      mejorSupermercado: comp.mejorSupermercado?.nombre || "N/A",
    }))
  }

  const toggleCategoriaExpansion = (categoria: string) => {
    const newExpanded = new Set(expandedCategorias)
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria)
    } else {
      newExpanded.add(categoria)
    }
    setExpandedCategorias(newExpanded)
  }

  // Filtrar comparaciones
  const comparacionesFiltradas = comparaciones.filter((comp) => {
    const coincideBusqueda = comp.categoria.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = categoriaFiltro === "todas" || comp.categoria === categoriaFiltro
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
          Comparar Precios por Categoría entre Supermercados
        </h1>
        <p className="text-gray-600">Encuentra los supermercados más baratos según tus compras</p>
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
                    <Badge variant="secondary">{stat.totalProductos} productos</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-600">
                      ${Math.round(stat.ahorroPromedio).toLocaleString("es-CO")} COP
                    </p>
                    <p className="text-sm text-gray-600">Ahorro potencial promedio</p>
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

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra por categoría y rango de fechas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar categorías..."
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
              <div>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  placeholder="Fecha inicio"
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  placeholder="Fecha fin"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparaciones por Categoría */}
      {comparacionesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-lg font-medium">No hay categorías para comparar</p>
            <p className="text-sm text-gray-600">
              Necesitas compras de productos en al menos 2 supermercados por categoría para hacer comparaciones
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comparacionesFiltradas.map((comparacion) => (
            <Card key={comparacion.categoria}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{comparacion.categoria}</span>
                    <Badge variant="secondary">
                      {comparacion.preciosPorSupermercado.reduce(
                        (sum, superData) => sum + superData.cantidadProductos,
                        0
                      )}{" "}
                      productos
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600">
                      Ahorra ${comparacion.ahorroPotencial.toLocaleString("es-CO")} COP
                    </span>
                    <button onClick={() => toggleCategoriaExpansion(comparacion.categoria)}>
                      {expandedCategorias.has(comparacion.categoria) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supermercado</TableHead>
                        <TableHead>Precio Promedio (COP)</TableHead>
                        <TableHead>Diferencia vs Mejor</TableHead>
                        <TableHead>Cantidad Productos</TableHead>
                        <TableHead>Total Gastado</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparacion.preciosPorSupermercado.map((superData) => {
                        const diferencia =
                          superData.precioPromedio - comparacion.preciosPorSupermercado[0].precioPromedio
                        const esMejor = superData.supermercado.id === comparacion.mejorSupermercado?.id

                        return (
                          <TableRow key={superData.supermercado.id} className={esMejor ? "bg-green-50" : ""}>
                            <TableCell className="font-medium">{superData.supermercado.nombre}</TableCell>
                            <TableCell className="font-semibold">
                              ${superData.precioPromedio.toLocaleString("es-CO")} COP
                            </TableCell>
                            <TableCell>
                              {diferencia === 0 ? (
                                <span className="text-green-600 font-medium">Mejor precio</span>
                              ) : (
                                <span className="text-red-600">+${diferencia.toLocaleString("es-CO")} COP</span>
                              )}
                            </TableCell>
                            <TableCell>{superData.cantidadProductos}</TableCell>
                            <TableCell>${superData.totalGastado.toLocaleString("es-CO")} COP</TableCell>
                            <TableCell>
                              {esMejor && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <Award className="h-4 w-4" />
                                  <span className="font-medium">Más barato</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Detalles de Productos (Expansible) */}
                {expandedCategorias.has(comparacion.categoria) && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Productos en esta categoría</h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Supermercado</TableHead>
                            <TableHead>Precio Unitario</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Fecha Compra</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparacion.detallesProductos.map((prodData) =>
                            prodData.detalles.map((detalle, index) => (
                              <TableRow key={`${prodData.producto.id}-${index}`}>
                                <TableCell className="font-medium">{prodData.producto.nombre}</TableCell>
                                <TableCell>{detalle.supermercado.nombre}</TableCell>
                                <TableCell>
                                  ${detalle.precioUnitario.toLocaleString("es-CO")} COP
                                </TableCell>
                                <TableCell>{detalle.cantidad}</TableCell>
                                <TableCell>
                                  {new Date(detalle.fecha).toLocaleDateString("es-CO")}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}