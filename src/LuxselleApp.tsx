import { Toaster } from 'react-hot-toast'
import { BrowserRouter, NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { 
  LayoutGrid, 
  Package, 
  Calculator, 
  Globe, 
  Users, 
  ClipboardList, 
  Bell 
} from 'lucide-react'

import InventoryView from './components/inventory/InventoryView'
import BuyingListView from './components/buying-list/BuyingListView'
import EvaluatorView from './components/evaluator/EvaluatorView'
import SupplierHubView from './components/supplier/SupplierHubView'
import DashboardView from './components/dashboard/DashboardView'
import SourcingView from './components/sourcing/SourcingView'

const navItems = [
  { label: 'Overview', path: '/', icon: LayoutGrid },
  { label: 'Inventory', path: '/inventory', icon: Package },
  { label: 'Buy Box', path: '/buy-box', icon: Calculator },
  { label: 'Supplier Hub', path: '/supplier-hub', icon: Globe },
  { label: 'Sourcing', path: '/sourcing', icon: Users },
  { label: 'Buying List', path: '/buying-list', icon: ClipboardList },
]

const LuxselleApp = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans">
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex h-16 max-w-8xl items-center justify-between px-6">
            {/* Brand */}
            <div className="flex items-center gap-3 pr-8">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white font-serif font-bold text-lg">
                L
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display font-bold text-gray-900">Luxselle</span>
                <span className="text-[10px] font-medium tracking-wider text-gray-500">MANAGER</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-gray-50 text-gray-900 shadow-sm ring-1 ring-gray-200' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4 pl-4 border-l border-gray-100 ml-4">
              <button 
                className="relative text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 ring-2 ring-white shadow-sm">
                JK
              </div>
            </div>
          </div>
        </header>

        <Toaster position="top-center" toastOptions={{ 
          className: 'text-sm font-medium',
          duration: 4000 
        }} />
        
        <main className="mx-auto max-w-8xl px-6 py-8">
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/inventory" element={<InventoryView />} />
            <Route path="/buy-box" element={<EvaluatorView />} />
            <Route path="/supplier-hub" element={<SupplierHubView />} />
            <Route path="/buying-list" element={<BuyingListView />} />
            <Route path="/sourcing" element={<SourcingView />} />
            
            {/* Redirects for legacy routes */}
            <Route path="/evaluator" element={<Navigate to="/buy-box" replace />} />
            <Route path="/suppliers" element={<Navigate to="/supplier-hub" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default LuxselleApp
