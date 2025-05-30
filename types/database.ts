export interface Compra {
  id: string
  user_id: string
  nombre: string
  categoria: string
  precio: number
  cantidad: number
  fecha: string
  supermercado_id?: string
  mes: number
  año: number
  created_at: string
  supermercado?: Supermercado
}

export interface Supermercado {
  id: string
  user_id: string
  nombre: string
  direccion?: string
  latitud?: number
  longitud?: number
  created_at: string
}

export interface Producto {
  id: string
  user_id: string
  nombre: string
  categoria: string
  created_at: string
}

export interface PrecioProducto {
  id: string
  producto_id: string
  supermercado_id: string
  precio: number
  fecha_actualizacion: string
  created_at: string
  producto?: Producto
  supermercado?: Supermercado
}

export interface UserProfile {
  id: string
  email: string
  created_at: string
}
