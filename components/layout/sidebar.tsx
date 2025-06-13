"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Home, Calendar, Store, BarChart3, MapPin, LogOut, Menu, X, ShoppingCart } from "lucide-react"
import Link from "next/link"

const menuItems = [
  { href: "/dashboard", icon: Home, label: "Inicio" },
  { href: "/dashboard/meses", icon: Calendar, label: "Compras por Mes" },
  { href: "/dashboard/supermercados", icon: Store, label: "Supermercados" },
  { href: "/dashboard/Lista-compras", icon: ShoppingCart, label: "Lista de Compras" },
  { href: "/dashboard/mapa", icon: MapPin, label: "Mapa de Tiendas" },
]

interface SidebarProps {
  userEmail?: string
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden bg-white shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed left-0 top-0 h-full w-72 sm:w-80 md:w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:z-auto
      `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 sm:h-8 w-6 sm:w-8 text-green-600 shrink-0" />
              <div className="min-w-0">
                <h2 className="font-bold text-base sm:text-lg truncate">Compras del Mes</h2>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 sm:p-4 overflow-y-auto">
            <ul className="space-y-1 sm:space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-3 sm:py-2 rounded-lg transition-colors text-sm sm:text-base
                        ${isActive ? "bg-green-100 text-green-700 font-medium" : "text-gray-700 hover:bg-gray-100"}
                      `}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-gray-200">
            <Button variant="outline" className="w-full justify-start text-sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}