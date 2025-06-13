"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Check, Trash2 } from "lucide-react"

const categorias = ["Alimentos", "Limpieza", "Otros"]

interface ShoppingItem {
  id: string
  item_name: string
  quantity: number
  category: string
  purchased: boolean
  created_at: string
}

export default function ListaComprasPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, category: "Alimentos" })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .eq("id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error("Error cargando ítems:", error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = async () => {
    if (!newItem.name.trim()) return
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("shopping_lists")
        .insert({
          id: user.id,
          item_name: newItem.name,
          quantity: newItem.quantity,
          category: newItem.category,
          purchased: false,
        })

      if (error) throw error
      setNewItem({ name: "", quantity: 1, category: "Alimentos" })
      fetchItems()
    } catch (error) {
      console.error("Error agregando ítem:", error)
    } finally {
      setLoading(false)
    }
  }

  const togglePurchased = async (itemName: string, purchased: boolean) => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("shopping_lists")
        .update({ purchased })
        .eq("id", user.id)
        .eq("item_name", itemName)

      if (error) throw error
      fetchItems()
    } catch (error) {
      console.error("Error actualizando ítem:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (itemName: string) => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("shopping_lists")
        .delete()
        .eq("id", user.id)
        .eq("item_name", itemName)

      if (error) throw error
      fetchItems()
    } catch (error) {
      console.error("Error eliminando ítem:", error)
    } finally {
      setLoading(false)
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
          <ShoppingCart className="h-8 w-8" />
          Mi Lista de Compras
        </h1>
        <p className="text-gray-600">Administra tus compras pendientes y marcadas</p>
      </div>

      {/* Formulario para agregar ítems */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar Ítem</CardTitle>
          <CardDescription>Ingresa un nuevo producto a tu lista</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Ej. Leche"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <Select
              value={newItem.category}
              onValueChange={(value) => setNewItem({ ...newItem, category: value })}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addItem} disabled={!newItem.name.trim() || loading}>
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de ítems */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-lg font-medium">No hay ítems en tu lista</p>
            <p className="text-sm text-gray-600">Agrega un producto para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Compras</CardTitle>
            <CardDescription>Revisa y gestiona tus ítems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ítem</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.item_name} className={item.purchased ? "bg-green-50" : ""}>
                      <TableCell className={item.purchased ? "line-through text-gray-500" : ""}>
                        {item.item_name}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={item.purchased}
                          onChange={(e) => togglePurchased(item.item_name, e.target.checked)}
                          className="mr-2 h-4 w-4"
                        />
                        {item.purchased ? "Comprado" : "Pendiente"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteItem(item.item_name)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}