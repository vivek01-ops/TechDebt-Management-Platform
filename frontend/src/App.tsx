import { BrowserRouter, Routes, Route, NavLink, useParams, Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import * as api from './api'
import {
  LayoutDashboard, Cloud, Server, Package, ShieldAlert, AlertTriangle, BarChart3,
  Wrench, Network, History, Database, Users, Settings, RefreshCw, Search, Play, LogOut,
  Activity, ChevronRight, CheckCircle2, Clock, XCircle, Info, Bell, X, Loader2, Inbox,
  Menu, Sun, Moon, Monitor, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'

type ThemePreference = 'light' | 'dark' | 'system'
type Theme = 'light' | 'dark'
type ToastTone = 'success' | 'error' | 'info' | 'warning'
type Toast = { id: number; title: string; description?: string; tone: ToastTone }

const ThemeContext = createContext<{ preference: ThemePreference; theme: Theme; setPreference: (p: ThemePreference) => void; cycleTheme: () => void; toggle: () => void } | null>(null)
const ToastContext = createContext<{ notify: (t: Omit<Toast, 'id'>) => void } | null>(null)

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem('td_theme')
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'system'
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(getInitialPreference)
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)
  const theme: Theme = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e?: MediaQueryListEvent) => setSystemTheme(e ? (e.matches ? 'dark' : 'light') : (mql.matches ? 'dark' : 'light'))
    onChange()
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('td_theme', preference)
  }, [theme, preference])

  const cycleTheme = useCallback(() => {
    setPreference(p => p === 'system' ? 'light' : p === 'light' ? 'dark' : 'system')
  }, [])

  return <ThemeContext.Provider value={{ preference, theme, setPreference, cycleTheme, toggle: cycleTheme }}>{children}</ThemeContext.Provider>
}

function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const notify = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts(prev => [...prev, { ...t, id }])
    window.setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4500)
  }, [])
  const remove = (id: number) => setToasts(prev => prev.filter(x => x.id !== id))
  const iconFor = (tone: ToastTone) => tone === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : tone === 'error' ? <XCircle size={16} className="text-red-400" /> : tone === 'warning' ? <AlertTriangle size={16} className="text-amber-400" /> : <Info size={16} className="text-sky-400" />
  const borderFor = (tone: ToastTone) => tone === 'success' ? 'border-emerald-800/60' : tone === 'error' ? 'border-red-800/60' : tone === 'warning' ? 'border-amber-800/60' : 'border-sky-800/60'
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto rounded-xl border ${borderFor(t.tone)} bg-slate-900/95 p-3 shadow-2xl shadow-black/40 backdrop-blur`}>
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{iconFor(t.tone)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">{t.title}</div>
                {t.description && <div className="mt-0.5 break-words text-xs text-slate-400">{t.description}</div>}
              </div>
              <button onClick={() => remove(t.id)} className="rounded p-0.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300"><X size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const navGroups = [
  { title: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/watchlist', label: 'EOS/EOL Watchlist', icon: ShieldAlert },
  ]},
  { title: 'Inventory', items: [
    { to: '/accounts', label: 'AWS Accounts', icon: Cloud },
    { to: '/resources', label: 'Resources', icon: Server },
    { to: '/software', label: 'Software', icon: Package },
  ]},
  { title: 'Lifecycle & Risk', items: [
    { to: '/lifecycle', label: 'Lifecycle Catalog', icon: Database },
    { to: '/analytics', label: 'Debt Analytics', icon: BarChart3 },
    { to: '/risk', label: 'Risk Assessment', icon: AlertTriangle },
    { to: '/remediation', label: 'Remediation', icon: Wrench },
  ]},
  { title: 'Operations', items: [
    { to: '/coverage', label: 'Collector Coverage', icon: Network },
    { to: '/history', label: 'Collection History', icon: History },
    { to: '/sources', label: 'Data Sources', icon: Database },
    { to: '/teams', label: 'Teams & Ownership', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]},
]

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/accounts': 'AWS Accounts',
  '/resources': 'Resource Inventory',
  '/software': 'Software Inventory',
  '/lifecycle': 'Lifecycle Catalog',
  '/watchlist': 'EOS/EOL Watchlist',
  '/analytics': 'Technical Debt Analytics',
  '/risk': 'Risk Assessment',
  '/remediation': 'Remediation',
  '/coverage': 'Collector Coverage',
  '/history': 'Collection History',
  '/sources': 'Lifecycle Data Sources',
  '/teams': 'Teams & Ownership',
  '/settings': 'Settings',
}

function formatDate(v: any) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString()
}

function formatErr(err: any): string {
  if (!err) return 'Unknown error'
  const status = err?.response?.status
  const data = err?.response?.data
  const msg = data?.detail || data?.error || data?.message || err?.message || String(err)
  const text = typeof msg === 'string' ? msg : JSON.stringify(msg)
  if (status === 502 || err?.code === 'ERR_BAD_RESPONSE') return `${text} (Backend unavailable or proxy error)`
  if (status === 401 || status === 403) return `${text} (Authentication/authorization error)`
  return text
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, cycleTheme } = useTheme()
  const label = preference === 'system' ? 'System' : preference === 'dark' ? 'Dark' : 'Light'
  const next = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system'
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun
  return (
    <button
      onClick={cycleTheme}
      title={`Theme: ${label} (click to switch to ${next})`}
      className={`inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${compact ? 'px-2.5' : ''}`}
    >
      <Icon size={15} />
      {!compact && <span>{label} mode</span>}
    </button>
  )
}

function StatCard({ label, value, hint, tone, icon: Icon, loading }: { label: string; value: ReactNode; hint?: string; tone?: 'default'|'good'|'warn'|'critical'; icon?: any; loading?: boolean }) {
  const tones: any = { default: 'text-white', good: 'text-emerald-400', warn: 'text-amber-400', critical: 'text-red-400' }
  const ring: any = { default: 'border-slate-800', good: 'border-emerald-900/40', warn: 'border-amber-900/40', critical: 'border-red-900/40' }
  const accent: any = { default: 'from-slate-500/30 to-transparent', good: 'from-emerald-500/40 to-transparent', warn: 'from-amber-500/40 to-transparent', critical: 'from-red-500/40 to-transparent' }
  return (
    <div className={`card-hover glass-panel relative overflow-hidden rounded-xl border bg-slate-900/60 p-4 ${ring[tone || 'default']}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent[tone || 'default']}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
          <div className={`mt-2 text-2xl font-semibold tracking-tight ${tones[tone || 'default']}`}>{loading ? <span className="text-slate-500">—</span> : value}</div>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
        {Icon && <div className="rounded-xl border border-slate-700/50 bg-slate-800/80 p-2.5 text-amber-400 shadow-sm"><Icon size={18} /></div>}
      </div>
    </div>
  )
}

function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`glass-panel rounded-xl border border-slate-800 bg-slate-900/60 ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 bg-slate-950/20 px-4 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-800/70 bg-slate-900/30 px-4 py-4 glass-panel animate-fade-up">
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-400/80">TechDebt Platform</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default'|'good'|'warn'|'critical'|'info' }) {
  const cls = tone === 'good' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
    : tone === 'warn' ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
    : tone === 'critical' ? 'bg-red-950/60 text-red-300 border-red-800/60'
    : tone === 'info' ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
    : 'bg-slate-800 text-slate-300 border-slate-700'
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}

function InlineAlert({ tone = 'info', title, message, action }: { tone?: 'info'|'success'|'warning'|'error'; title?: string; message: string; action?: ReactNode }) {
  const styles = tone === 'error' ? 'border-red-900/60 bg-red-950/30 text-red-200'
    : tone === 'success' ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
    : tone === 'warning' ? 'border-amber-900/60 bg-amber-950/30 text-amber-200'
    : 'border-sky-900/60 bg-sky-950/30 text-sky-200'
  const Icon = tone === 'error' ? XCircle : tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertTriangle : Info
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${styles}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-medium text-white">{title}</div>}
        <div className="break-words text-sm opacity-95">{message}</div>
      </div>
      {action}
    </div>
  )
}

function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />{label}</div>
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/30 px-6 py-10 text-center">
      <Inbox size={22} className="mb-2 text-slate-500" />
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-1 max-w-md text-sm text-slate-400">{description}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function Shell({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pageTitle = routeTitles[location.pathname] || (location.pathname.startsWith('/resources/') ? 'Resource Details' : 'TechDebt Platform')

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const Nav = ({ showLabels = true }: { showLabels?: boolean }) => (
    <nav className="flex-1 overflow-auto px-3 py-3">
      {navGroups.map(group => (
        <div key={group.title} className="mb-4">
          {showLabels && <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">{group.title}</div>}
          <div className="space-y-1">
            {group.items.map(item => {
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} title={!showLabels ? item.label : undefined} className={({isActive}) => `flex items-center gap-2 rounded-lg ${showLabels ? 'px-2.5 py-2' : 'justify-center px-2 py-2.5'} text-sm transition ${isActive ? 'bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/20' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}>
                  <Icon size={16} />
                  {showLabels && <span className="truncate">{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="theme-app min-h-screen bg-slate-950 text-slate-200">
      <div className="flex min-h-screen">
        <aside className={`theme-sidebar sticky top-0 hidden h-screen shrink-0 border-r border-slate-800 bg-slate-950/95 transition-all duration-200 lg:flex lg:flex-col ${collapsed ? 'w-[76px]' : 'w-[272px]'}`}>
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-amber-400 ring-1 ring-amber-500/20"><Activity size={18} /></div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">TechDebt Platform</div>
                  <div className="text-[11px] text-slate-500">AWS Lifecycle Intelligence</div>
                </div>
              )}
            </div>
            <button onClick={() => setCollapsed(v => !v)} className="rounded-lg border border-transparent p-1.5 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-white" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          <Nav showLabels={!collapsed} />
          <div className="border-t border-slate-800 p-3">
            {onLogout && <button onClick={onLogout} title={!collapsed ? undefined : 'Logout'} className={`flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 ${collapsed ? 'justify-center px-2 py-2.5' : 'px-2.5 py-2'} text-sm text-slate-300 hover:bg-slate-900 hover:text-white`}><LogOut size={16} />{!collapsed && 'Logout'}</button>}
          </div>
        </aside>

        {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
        <aside className={`theme-sidebar fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-800 bg-slate-950/98 transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400"><Activity size={18} /></div>
              <div className="text-sm font-semibold text-white">TechDebt Platform</div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white"><X size={16} /></button>
          </div>
          <Nav />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="theme-header sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
            <div className="flex h-[60px] items-center justify-between px-4 lg:px-6">
              <div className="flex min-w-0 items-center gap-2 text-sm text-slate-400">
                <button onClick={() => setMobileOpen(true)} className="mr-1 rounded-lg border border-slate-800 bg-slate-900/40 p-1.5 text-slate-300 hover:bg-slate-900 lg:hidden"><Menu size={18} /></button>
                <span className="hidden rounded-md bg-slate-900/60 px-2 py-1 text-xs font-medium text-slate-300 sm:inline">TechDebt</span>
                <ChevronRight size={14} className="hidden sm:inline text-slate-600" />
                <span className="truncate font-medium text-slate-200">{pageTitle}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="hidden items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/50 px-2.5 py-1 md:inline-flex"><Bell size={13} />Notifications enabled</span>
                <Badge tone="good">Read-only AWS</Badge>
                <ThemeToggle compact />
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}

function OverviewPage() {
  const { theme } = useTheme()
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['overview'], queryFn: api.getOverview })
  const chartText = theme === 'dark' ? '#94a3b8' : '#475569'
  const chartBorder = theme === 'dark' ? '#0f172a' : '#ffffff'
  const pieOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { textStyle: { color: chartText }, bottom: 0, icon: 'circle' },
    series: [{
      type: 'pie', radius: ['50%', '72%'], center: ['50%', '42%'],
      itemStyle: { borderRadius: 6, borderColor: chartBorder, borderWidth: 2 },
      label: { show: false },
      data: [
        { value: data?.unsupported || 0, name: 'Unsupported', itemStyle: { color: '#ef4444' } },
        { value: data?.approaching_eol || 0, name: 'Approaching EOL', itemStyle: { color: '#f97316' } },
        { value: data?.approaching_eos || 0, name: 'Approaching EOS', itemStyle: { color: '#f59e0b' } },
        { value: data?.unknown_lifecycle || 0, name: 'Unknown', itemStyle: { color: '#64748b' } },
        { value: Math.max((data?.total_resources || 0) - (data?.outdated_technologies || 0) - (data?.unknown_lifecycle || 0), 0), name: 'Healthy/Other', itemStyle: { color: '#10b981' } },
      ]
    }]
  }), [data, chartText, chartBorder])

  const statusTone = (s: any): 'good'|'warn'|'critical'|'info' => {
    const v = String(s || '').toLowerCase()
    if (v.includes('fail') || v.includes('error')) return 'critical'
    if (v.includes('complete') || v.includes('success') || v.includes('done')) return 'good'
    if (v.includes('run') || v.includes('progress')) return 'info'
    return 'warn'
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Organization-wide AWS technology lifecycle posture, inventory health, and technical debt exposure"
        actions={<button onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60"><RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/>{isFetching ? 'Refreshing' : 'Refresh'}</button>}
      />

      <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-sky-500/5 to-transparent p-4 glass-panel animate-fade-up">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Getting started</div>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">Connect an AWS account, run a scan, sync lifecycle data, and recompute matches to populate insights across the platform.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/accounts" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm hover:bg-slate-800">Manage Accounts</Link>
            <Link to="/lifecycle" className="btn-primary-glow inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400">Sync Lifecycle</Link>
          </div>
        </div>
      </div>

      {error && <InlineAlert tone="error" title="Unable to load dashboard" message={formatErr(error)} action={<button onClick={() => refetch()} className="rounded-md border border-red-700/40 px-2.5 py-1.5 text-xs hover:bg-red-900/20">Retry</button>} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="AWS Accounts" value={data?.total_accounts ?? 0} hint={`${data?.scanned_accounts ?? 0} connected/scanned`} icon={Cloud} loading={isLoading} />
        <StatCard label="Discovered Resources" value={data?.total_resources ?? 0} hint={`${data?.running_resources ?? 0} in running state`} icon={Server} tone={data && data.total_resources === 0 ? 'warn' : 'default'} loading={isLoading} />
        <StatCard label="Unsupported / Past EOL" value={data?.unsupported ?? 0} hint="Requires immediate attention" icon={XCircle} tone={data && data.unsupported > 0 ? 'critical' : 'good'} loading={isLoading} />
        <StatCard label="Collection Coverage" value={`${data?.collection_coverage?.percent || 0}%`} hint={`${data?.collection_coverage?.fully_supported || 0}/${data?.collection_coverage?.total_adapters || 0} adapters supported`} icon={CheckCircle2} tone={(data?.collection_coverage?.percent || 0) >= 50 ? 'good' : 'warn'} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Lifecycle Risk Distribution" subtitle="Based on matched lifecycle records (unknown/unassessed shown separately)" className="xl:col-span-2">
          {isLoading ? <LoadingState label="Loading metrics..." /> : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3"><ReactECharts option={pieOption} style={{ height: 300 }} /></div>
              <div className="space-y-3 lg:col-span-2">
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3"><span className="text-sm text-slate-300">Approaching EOS (≤90d)</span><Badge tone={data?.approaching_eos ? 'warn' : 'good'}>{data?.approaching_eos ?? 0}</Badge></div>
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3"><span className="text-sm text-slate-300">Approaching EOL (≤90d)</span><Badge tone={data?.approaching_eol ? 'warn' : 'good'}>{data?.approaching_eol ?? 0}</Badge></div>
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3"><span className="text-sm text-slate-300">Unsupported</span><Badge tone={data?.unsupported ? 'critical' : 'good'}>{data?.unsupported ?? 0}</Badge></div>
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3"><span className="text-sm text-slate-300">Unknown lifecycle</span><Badge tone={data?.unknown_lifecycle ? 'warn' : 'default'}>{data?.unknown_lifecycle ?? 0}</Badge></div>
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3"><span className="text-sm text-slate-300">Outdated technologies</span><Badge tone={data?.outdated_technologies ? 'warn' : 'good'}>{data?.outdated_technologies ?? 0}</Badge></div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Latest Collection" subtitle="Most recent inventory scan status">
          {isLoading ? <LoadingState label="Loading status..." /> : data?.last_collection?.id ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-400">Run</span><span className="font-medium text-white">#{data.last_collection.id}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Status</span><Badge tone={statusTone(data.last_collection.status)}>{String(data.last_collection.status)}</Badge></div>
              <div className="flex items-center justify-between gap-3"><span className="text-slate-400">Started</span><span className="text-right text-xs text-slate-300">{formatDate(data.last_collection.started_at)}</span></div>
              {data.last_collection.summary && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Summary</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(data.last_collection.summary || {}).slice(0, 8).map(([k, v]) => (
                      <div key={k} className="rounded border border-slate-800 bg-slate-900/50 px-2 py-1.5"><div className="text-slate-500">{k}</div><div className="truncate text-slate-200" title={typeof v === 'object' ? JSON.stringify(v) : String(v)}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div></div>
                    ))}
                  </div>
                </div>
              )}
              <Link to="/history" className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline">View collection history <ChevronRight size={12} /></Link>
            </div>
          ) : (
            <EmptyState title="No collection runs yet" description="Connect an AWS account and run a scan to populate dashboard data." action={<Link to="/accounts" className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400">Go to AWS Accounts</Link>} />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link to="/watchlist" className="group card-hover glass-panel rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-amber-700/40 hover:bg-slate-900">
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 ring-1 ring-amber-500/20"><ShieldAlert size={18}/></div><span className="font-medium text-white">EOS/EOL Watchlist</span></div><ChevronRight size={16} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-amber-400"/></div>
          <p className="mt-3 text-sm leading-6 text-slate-400">Review technologies nearing or past lifecycle milestones and prioritize remediation.</p>
        </Link>
        <Link to="/resources" className="group card-hover glass-panel rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-700/40 hover:bg-slate-900">
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="rounded-lg bg-sky-500/10 p-2 text-sky-400 ring-1 ring-sky-500/20"><Server size={18}/></div><span className="font-medium text-white">Resource Inventory</span></div><ChevronRight size={16} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-sky-400"/></div>
          <p className="mt-3 text-sm leading-6 text-slate-400">Search discovered AWS resources, states, versions, and enrichment details.</p>
        </Link>
        <Link to="/coverage" className="group card-hover glass-panel rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-emerald-700/40 hover:bg-slate-900">
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 ring-1 ring-emerald-500/20"><Network size={18}/></div><span className="font-medium text-white">Collector Coverage</span></div><ChevronRight size={16} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-400"/></div>
          <p className="mt-3 text-sm leading-6 text-slate-400">Inspect adapter coverage, discovery breadth, and collection diagnostics.</p>
        </Link>
      </div>
    </div>
  )
}

function AccountsPage() {
  const qc = useQueryClient()
  const { notify } = useToast()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['accounts'], queryFn: api.getAccounts })
  const connectMut = useMutation({
    mutationFn: (id:number)=>api.connectAccount(id),
    onSuccess: (res) => {
      qc.invalidateQueries({queryKey:['accounts']})
      notify({ tone: res?.ok === false ? 'warning' : 'success', title: res?.ok === false ? 'Connection check completed with issues' : 'Account connection verified', description: res?.ok === false ? (res?.error || 'Review account status for details.') : 'AWS connectivity and regions were refreshed.' })
    },
    onError: (err) => notify({ tone: 'error', title: 'Failed to connect account', description: formatErr(err) })
  })
  const scanMut = useMutation({
    mutationFn: (id:number)=>api.scanAccount(id),
    onSuccess: (res) => {
      qc.invalidateQueries({queryKey:['overview']}); qc.invalidateQueries({queryKey:['resources']}); qc.invalidateQueries({queryKey:['runs']})
      const summary = res?.summary || res?.result || res
      const count = typeof summary === 'object' ? (summary?.resources_discovered ?? summary?.discovered ?? summary?.total_resources) : undefined
      notify({ tone: 'success', title: 'Scan completed', description: count != null ? `Discovered/processed resources: ${count}.` : 'Inventory scan finished. Dashboards and inventory will refresh.' })
    },
    onError: (err) => notify({ tone: 'error', title: 'Scan failed', description: formatErr(err) })
  })
  return (
    <div className="space-y-5">
      <PageHeader title="AWS Accounts" subtitle="Manage connected AWS accounts, discover regions, and run read-only inventory scans" actions={<button onClick={()=>refetch()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800"><RefreshCw size={14}/>Refresh</button>} />
      {error && <InlineAlert tone="error" title="Unable to load accounts" message={formatErr(error)} action={<button onClick={()=>refetch()} className="rounded-md border border-red-700/40 px-2.5 py-1.5 text-xs hover:bg-red-900/20">Retry</button>} />}
      <Panel title="Connected Accounts" subtitle={`${data?.total ?? 0} account(s) registered`}>
        {isLoading ? <LoadingState label="Loading accounts..." /> : (!data?.items || data.items.length === 0) ? (
          <EmptyState title="No accounts connected yet" description="Sign in from the portal login page to connect an AWS account using Access Key and Secret Access Key." action={<Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">Open login page</Link>} />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800"><th className="py-2 pr-3 text-left">Account</th><th className="py-2 pr-3 text-left">Account ID</th><th className="py-2 pr-3 text-left">Status</th><th className="py-2 pr-3 text-left">Regions</th><th className="py-2 pr-3 text-left">Actions</th></tr></thead>
              <tbody>
                {data.items.map((a:any)=> {
                  const busy = (connectMut.isPending && connectMut.variables === a.id) || (scanMut.isPending && scanMut.variables === a.id)
                  return (
                    <tr key={a.id} className="border-b border-slate-800/60">
                      <td className="py-3 pr-3 font-medium text-white">{a.account_name || '-'}</td>
                      <td className="py-3 pr-3 font-mono text-xs text-slate-300">{a.account_id || '-'}</td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1">
                          <Badge tone={a.last_connection_status==='connected'?'good':a.last_connection_status==='failed'?'critical':'warn'}>{a.last_connection_status || a.status || 'unknown'}</Badge>
                          {a.last_error && <div className="max-w-md truncate text-xs text-red-400" title={a.last_error}>{a.last_error}</div>}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-slate-300">{a.regions_count ?? '-'}</td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={()=>connectMut.mutate(a.id)} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-50">{connectMut.isPending && connectMut.variables===a.id ? <Loader2 size={12} className="animate-spin"/> : null}Connect</button>
                          <button onClick={()=>scanMut.mutate(a.id)} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-amber-700/50 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 disabled:opacity-50">{scanMut.isPending && scanMut.variables===a.id ? <Loader2 size={12} className="animate-spin"/> : <Play size={12}/>}Scan</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function ResourcesPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const { data, isLoading, error, isFetching, refetch } = useQuery({ queryKey: ['resources', search], queryFn: () => api.getResources(search ? { q: search } : {}) })
  const submit = () => setSearch(q.trim())
  return (
    <div className="space-y-5">
      <PageHeader title="Resource Inventory" subtitle="Discovered AWS resources across accounts and regions" />
      {error && <InlineAlert tone="error" title="Unable to load resources" message={formatErr(error)} action={<button onClick={()=>refetch()} className="rounded-md border border-red-700/40 px-2.5 py-1.5 text-xs hover:bg-red-900/20">Retry</button>} />}
      <Panel title="Resources" subtitle={`Total: ${data?.total ?? 0}${search ? ` · filtered by "${search}"` : ''}`} action={
        <div className="flex flex-wrap gap-2">
          <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" /><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') submit() }} placeholder="Search name, ID, ARN..." className="w-64 rounded-lg border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-sm outline-none ring-amber-500/20 focus:border-amber-600 focus:ring-2" /></div>
          <button onClick={submit} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">Search</button>
          {search && <button onClick={()=>{setQ(''); setSearch('')}} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">Clear</button>}
        </div>
      }>
        {isLoading ? <LoadingState label="Loading resources..." /> : (!data?.items || data.items.length === 0) ? (
          <EmptyState title={search ? 'No matching resources' : 'No resources discovered yet'} description={search ? 'Try a different search term or clear the filter.' : 'Run an account scan from AWS Accounts to populate inventory.'} />
        ) : (
          <div className="overflow-auto">
            {isFetching && <div className="mb-2 text-xs text-slate-500">Updating results...</div>}
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800">
                <th className="py-2 pr-3 text-left">Name / ID</th><th className="py-2 pr-3 text-left">Service</th><th className="py-2 pr-3 text-left">Type</th><th className="py-2 pr-3 text-left">Account</th><th className="py-2 pr-3 text-left">Region</th><th className="py-2 pr-3 text-left">State</th><th className="py-2 pr-3 text-left">Version</th>
              </tr></thead>
              <tbody>
                {data.items.map((r:any)=>(
                  <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="py-3 pr-3"><Link to={`/resources/${r.id}`} className="font-medium text-sky-400 hover:underline">{r.name || r.resource_id}</Link><div className="max-w-xs truncate font-mono text-xs text-slate-500" title={r.arn || r.resource_id}>{r.arn || r.resource_id}</div></td>
                    <td className="py-3 pr-3 text-slate-300">{r.service}</td>
                    <td className="py-3 pr-3 text-xs text-slate-400">{r.resource_type}</td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-300">{r.account_id || '-'}</td>
                    <td className="py-3 pr-3 text-slate-300">{r.region || 'global'}</td>
                    <td className="py-3 pr-3"><Badge tone={r.normalized_state==='Running'||r.normalized_state==='Available'?'good':r.normalized_state==='Stopped'?'warn':'default'}>{r.normalized_state || 'Unknown'}</Badge></td>
                    <td className="py-3 pr-3 text-xs text-slate-400">{r.version_info && Object.keys(r.version_info).length ? JSON.stringify(r.version_info) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function ResourceDetailPage() {
  const { id } = useParams()
  const { data, isLoading, error } = useQuery({ queryKey: ['resource', id], queryFn: () => api.getResource(Number(id)), enabled: !!id })
  if (isLoading) return <div className="space-y-4"><PageHeader title="Resource Details" subtitle="Loading resource..." /><LoadingState label="Loading resource details..." /></div>
  if (error || !data) return <div className="space-y-4"><PageHeader title="Resource Details" subtitle="Requested resource could not be loaded" /><InlineAlert tone="error" title="Resource not found" message={error ? formatErr(error) : 'The requested resource does not exist or is no longer available.'} action={<Link to="/resources" className="rounded-md border border-red-700/40 px-2.5 py-1.5 text-xs hover:bg-red-900/20">Back to inventory</Link>} /></div>
  return (
    <div className="space-y-5">
      <PageHeader title={data.name || data.resource_id} subtitle={`${data.resource_type || 'Resource'} · ${data.region || 'global'} · ${data.account?.account_id || data.account_id || 'Unknown account'}`} actions={<Link to="/resources" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">Back</Link>} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Overview" subtitle="Resource metadata and state">
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-400">ARN:</span> <span className="break-all font-mono text-xs text-slate-300">{data.arn || '-'}</span></div>
            <div><span className="text-slate-400">State:</span> <Badge tone={data.normalized_state==='Running'||data.normalized_state==='Available'?'good':data.normalized_state==='Stopped'?'warn':'default'}>{data.normalized_state || 'Unknown'}</Badge> {data.original_state ? <span className="text-slate-500">(AWS: {data.original_state})</span> : ''}</div>
            <div><span className="text-slate-400">Discovery:</span> <span className="text-slate-300">{data.discovery_source || '-'}</span></div>
            <div><span className="text-slate-400">Enrichment:</span> <span className="text-slate-300">{data.enrichment_status || '-'} / {data.data_completeness || '-'}</span></div>
            <div><span className="text-slate-400">Version info:</span></div>
            <pre className="overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{JSON.stringify(data.version_info || {}, null, 2)}</pre>
          </div>
        </Panel>
        <Panel title="Tags & Software" subtitle="Ownership tags and detected components">
          <div className="mb-4 flex flex-wrap gap-2">
            {(data.tags||[]).map((t:any,i:number)=>(<span key={i} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs"><span className="text-slate-400">{t.key}:</span> {t.value}</span>))}
            {(!data.tags || data.tags.length===0) && <span className="text-sm text-slate-500">No tags</span>}
          </div>
          <div className="border-t border-slate-800 pt-3">
            <div className="mb-2 text-sm font-medium text-white">Software Installations</div>
            {data.software_installations?.length ? <ul className="space-y-1 text-sm text-slate-300">{data.software_installations.map((s:any)=><li key={s.id}>{s.name} {s.version || ''} <span className="text-slate-500">({s.source})</span></li>)}</ul> : <div className="text-sm text-slate-500">No software inventory collected yet (SSM/container integration may be required).</div>}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function LifecyclePage() {
  const qc = useQueryClient()
  const { notify } = useToast()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['lifecycle-products'], queryFn: () => api.getLifecycleProducts({ limit: 100 }) })
  const syncMut = useMutation({
    mutationFn: () => api.syncLifecycle(50),
    onSuccess: () => { qc.invalidateQueries({queryKey:['lifecycle-products']}); notify({ tone: 'success', title: 'Lifecycle sync completed', description: 'endoflife.date data synchronized successfully.' }) },
    onError: (err) => notify({ tone: 'error', title: 'Lifecycle sync failed', description: formatErr(err) })
  })
  return (
    <div className="space-y-5">
      <PageHeader title="Lifecycle Catalog" subtitle="Normalized lifecycle data from endoflife.date and extensible sources" actions={<button onClick={()=>syncMut.mutate()} disabled={syncMut.isPending} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-60">{syncMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}{syncMut.isPending?'Syncing...':'Sync endoflife.date'}</button>} />
      {error && <InlineAlert tone="error" title="Unable to load lifecycle catalog" message={formatErr(error)} action={<button onClick={()=>refetch()} className="rounded-md border border-red-700/40 px-2.5 py-1.5 text-xs hover:bg-red-900/20">Retry</button>} />}
      <Panel title="Products" subtitle={`Total: ${data?.total ?? 0}`}>
        {isLoading ? <LoadingState label="Loading lifecycle products..." /> : (!data?.items || data.items.length === 0) ? (
          <EmptyState title="No lifecycle products synced" description="Sync data from endoflife.date to populate the lifecycle catalog and enable matching." action={<button onClick={()=>syncMut.mutate()} disabled={syncMut.isPending} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-60">Sync now</button>} />
        ) : (
          <div className="overflow-auto"><table className="w-full text-sm"><thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800"><th className="py-2 pr-3 text-left">Product</th><th className="py-2 pr-3 text-left">Slug</th><th className="py-2 pr-3 text-left">Vendor</th><th className="py-2 pr-3 text-left">Aliases</th></tr></thead>
            <tbody>
              {data.items.map((p:any)=>(<tr key={p.id} className="border-b border-slate-800/60"><td className="py-3 pr-3 font-medium text-white">{p.title}</td><td className="py-3 pr-3 font-mono text-xs text-slate-400">{p.slug}</td><td className="py-3 pr-3 text-slate-300">{p.vendor || '-'}</td><td className="py-3 pr-3 text-xs text-slate-400">{(p.aliases||[]).join(', ') || '-'}</td></tr>))}
            </tbody></table></div>
        )}
      </Panel>
    </div>
  )
}

function WatchlistPage() {
  const qc = useQueryClient()
  const { notify } = useToast()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['watchlist'], queryFn: api.getWatchlist })
  const recompute = useMutation({
    mutationFn: api.recomputeMatches,
    onSuccess: () => { qc.invalidateQueries({queryKey:['watchlist']}); qc.invalidateQueries({queryKey:['overview']}); notify({ tone: 'success', title: 'Lifecycle matching recomputed', description: 'Watchlist and dashboard metrics have been refreshed.' }) },
    onError: (err) => notify({ tone: 'error', title: 'Failed to recompute matches', description: formatErr(err) })
  })
  return (
    <div className="space-y-5">
      <PageHeader title="EOS/EOL Watchlist" subtitle="Technologies approaching or past lifecycle milestones with independent EOS/EOL countdowns" actions={<button onClick={()=>recompute.mutate()} disabled={recompute.isPending} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-60">{recompute.isPending ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}{recompute.isPending?'Computing...':'Recompute Matches'}</button>} />
      {error && <InlineAlert tone="error" title="Unable to load watchlist" message={formatErr(error)} action={<button onClick={()=>refetch()} className="rounded-md border border-red-700/40 px-2.5 py-1.5 text-xs hover:bg-red-900/20">Retry</button>} />}
      <Panel title="Watchlist" subtitle="Sorted by nearest upcoming milestones">
        {isLoading ? <LoadingState label="Loading watchlist..." /> : (!data?.items || data.items.length === 0) ? (
          <EmptyState title="No lifecycle matches yet" description="Connect an account, run a scan, sync lifecycle data, then recompute matches to populate the watchlist." />
        ) : (
          <div className="overflow-auto"><table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800">
              <th className="py-2 pr-3 text-left">Resource</th><th className="py-2 pr-3 text-left">Service/Type</th><th className="py-2 pr-3 text-left">Technology</th><th className="py-2 pr-3 text-left">Version</th><th className="py-2 pr-3 text-left">Account/Region</th><th className="py-2 pr-3 text-left">EOS</th><th className="py-2 pr-3 text-left">EOL</th><th className="py-2 pr-3 text-left">Risk</th><th className="py-2 pr-3 text-left">Match</th>
            </tr></thead>
            <tbody>
              {data.items.map((m:any)=>(
                <tr key={m.match_id} className="border-b border-slate-800/60 align-top">
                  <td className="py-3 pr-3">{m.resource_id ? <Link to={`/resources/${m.resource_id}`} className="font-medium text-sky-400 hover:underline">{m.resource_name || m.resource_id}</Link> : '-'}</td>
                  <td className="py-3 pr-3 text-xs text-slate-300">{m.service}<div className="text-slate-500">{m.resource_type}</div></td>
                  <td className="py-3 pr-3 text-white">{m.technology}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-slate-300">{m.installed_version || '-'}</td>
                  <td className="py-3 pr-3 text-xs text-slate-300">{m.account_id || '-'}<div className="text-slate-500">{m.region || ''}</div></td>
                  <td className="py-3 pr-3 text-xs">{m.eos_date ? String(m.eos_date) : 'Unknown'}<div className={m.eos_days_remaining!=null && m.eos_days_remaining<0?'text-red-400':m.eos_days_remaining!=null && m.eos_days_remaining<=90?'text-amber-400':'text-slate-400'}>{m.eos_days_remaining!=null ? `${m.eos_days_remaining} days (${m.eos_state})` : m.eos_state || 'unknown'}</div></td>
                  <td className="py-3 pr-3 text-xs">{m.eol_date ? String(m.eol_date) : 'Unknown'}<div className={m.eol_days_remaining!=null && m.eol_days_remaining<0?'text-red-400':m.eol_days_remaining!=null && m.eol_days_remaining<=90?'text-amber-400':'text-slate-400'}>{m.eol_days_remaining!=null ? `${m.eol_days_remaining} days (${m.eol_state})` : m.eol_state || 'unknown'}</div></td>
                  <td className="py-3 pr-3"><Badge tone={m.risk==='Critical'?'critical':m.risk==='High'?'warn':m.risk==='Medium'?'warn':m.risk==='Low'?'good':'default'}>{m.risk}</Badge></td>
                  <td className="py-3 pr-3 text-xs text-slate-400"><div>{m.lifecycle_source || 'n/a'} · {m.match_status}</div><div className="max-w-xs truncate" title={m.reason||''}>{m.reason}</div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Panel>
    </div>
  )
}

function CoveragePage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['coverage'], queryFn: api.getCoverage })
  const { data: errors } = useQuery({ queryKey: ['coll-errors'], queryFn: api.getCollectionErrors })
  return (
    <div className="space-y-5">
      <PageHeader title="Collector Coverage" subtitle="Adapter registry, discovery breadth, and collection diagnostics" actions={<button onClick={()=>refetch()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800"><RefreshCw size={14}/>Refresh</button>} />
      {error && <InlineAlert tone="error" title="Unable to load coverage data" message={formatErr(error)} />}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Coverage Matrix" subtitle={`${data?.total ?? 0} resource types tracked`} className="xl:col-span-2">
          {isLoading ? <LoadingState label="Loading coverage..." /> : (!data?.items || data.items.length === 0) ? (
            <EmptyState title="No coverage records yet" description="Coverage data will appear after collectors run and resource types are registered." />
          ) : (
            <div className="overflow-auto"><table className="w-full text-sm"><thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800"><th className="py-2 pr-3 text-left">Service</th><th className="py-2 pr-3 text-left">Resource Type</th><th className="py-2 pr-3 text-left">Source</th><th className="py-2 pr-3 text-left">Status</th><th className="py-2 pr-3 text-left">Version</th><th className="py-2 pr-3 text-left">Last Collection</th></tr></thead>
              <tbody>
                {data.items.map((c:any,i:number)=>(<tr key={i} className="border-b border-slate-800/60"><td className="py-2.5 pr-3 text-slate-200">{c.aws_service}</td><td className="py-2.5 pr-3 text-xs text-slate-400">{c.resource_type}</td><td className="py-2.5 pr-3 text-slate-300">{c.discovery_source}</td><td className="py-2.5 pr-3"><Badge tone={c.coverage_status==='Fully Supported'?'good':c.coverage_status==='Collection Failed'?'critical':'warn'}>{c.coverage_status}</Badge></td><td className="py-2.5 pr-3">{c.version_support?'Yes':'No'}</td><td className="py-2.5 pr-3 text-xs text-slate-500">{formatDate(c.last_collection_at)}</td></tr>))}
              </tbody></table></div>
          )}
        </Panel>
        <Panel title="Recent Errors" subtitle="Collection diagnostics">
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {(!errors?.items || errors.items.length===0) ? <EmptyState title="No errors recorded" description="Collection errors and diagnostics will appear here when issues occur." /> : errors.items.slice(0,20).map((e:any)=>(<div key={e.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs"><div className="flex items-start justify-between gap-2"><div className="text-amber-300">{e.service} {e.resource_type || ''} {e.region ? `· ${e.region}`:''}</div><Badge tone={String(e.error_type||'').toLowerCase().includes('critical')?'critical':'warn'}>{e.error_type || 'error'}</Badge></div><div className="mt-1 break-words text-slate-300">{e.message}</div><div className="mt-1 text-slate-500">{formatDate(e.occurred_at)}</div></div>))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function HistoryPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['runs'], queryFn: api.getCollectionsRuns })
  return (
    <div className="space-y-5">
      <PageHeader title="Collection History" subtitle="Inventory scan runs and summaries" actions={<button onClick={()=>refetch()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800"><RefreshCw size={14}/>Refresh</button>} />
      {error && <InlineAlert tone="error" title="Unable to load collection history" message={formatErr(error)} />}
      <Panel title="Runs" subtitle={`${data?.total ?? 0} recorded`}>
        {isLoading ? <LoadingState label="Loading runs..." /> : (!data?.items || data.items.length === 0) ? (
          <EmptyState title="No collection runs recorded" description="Run a scan from AWS Accounts to create history entries." />
        ) : (
          <div className="overflow-auto"><table className="w-full text-sm"><thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800"><th className="py-2 pr-3 text-left">Run</th><th className="py-2 pr-3 text-left">Account</th><th className="py-2 pr-3 text-left">Status</th><th className="py-2 pr-3 text-left">Started</th><th className="py-2 pr-3 text-left">Summary</th></tr></thead>
            <tbody>
              {data.items.map((r:any)=> {
                const st = String(r.status || '').toLowerCase()
                const tone = st.includes('fail')||st.includes('error') ? 'critical' : (st.includes('complete')||st.includes('success')||st.includes('done') ? 'good' : 'warn')
                return (
                  <tr key={r.id} className="border-b border-slate-800/60 align-top">
                    <td className="py-3 pr-3 font-medium text-white">#{r.id}</td>
                    <td className="py-3 pr-3 text-slate-300">{r.account_id ?? '-'}</td>
                    <td className="py-3 pr-3"><Badge tone={tone as any}>{r.status}</Badge></td>
                    <td className="py-3 pr-3 text-xs text-slate-400">{formatDate(r.started_at)}</td>
                    <td className="py-3 pr-3"><pre className="max-w-xl whitespace-pre-wrap text-xs text-slate-300">{JSON.stringify(r.summary || {}, null, 2)}</pre></td>
                  </tr>
                )
              })}
            </tbody></table></div>
        )}
      </Panel>
    </div>
  )
}

function SimplePage({ title, subtitle, body, bullets }: { title: string; subtitle: string; body: string; bullets?: string[] }) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={subtitle} />
      <Panel title={title} subtitle="Information">
        <p className="text-sm leading-6 text-slate-300">{body}</p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {bullets.map((b, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" /><span>{b}</span></li>)}
          </ul>
        )}
      </Panel>
      <InlineAlert tone="info" title="Enterprise module" message="This area is part of the platform roadmap and currently displays configuration/capability guidance. Data-driven views will populate as integrations and backend modules are enabled." />
    </div>
  )
}

function isLoggedIn() {
  return localStorage.getItem('aws_portal_logged_in') === 'true'
}

function LoginPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const test = await api.testConnection({ access_key_id: accessKey, secret_access_key: secretKey })
      if (!test?.ok) throw new Error(test?.error || 'Invalid AWS credentials')
      const acct = await api.createAccount({
        account_id: test.identity?.account_id,
        account_name: test.identity?.account_id ? `AWS ${test.identity.account_id}` : 'AWS Account',
        auth_type: 'keys',
        access_key_id: accessKey,
        secret_access_key: secretKey,
      })
      let connectRes: any = null
      if (acct?.id) connectRes = await api.connectAccount(acct.id)
      if (connectRes && connectRes.ok === false) throw new Error(connectRes.error || 'Account was created but AWS connection failed')
      localStorage.setItem('aws_portal_logged_in', 'true')
      if (acct?.id) localStorage.setItem('aws_account_id', String(acct.id))
      notify({ tone: 'success', title: 'Signed in successfully', description: `Connected AWS account ${test.identity?.account_id || ''}`.trim() })
      navigate('/', { replace: true })
    } catch (err: any) {
      const msg = formatErr(err)
      setError(msg)
      notify({ tone: 'error', title: 'Sign-in failed', description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="theme-app relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-4 flex justify-end"><ThemeToggle compact /></div>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-amber-400 ring-1 ring-amber-500/20 shadow-lg shadow-amber-500/10"><Activity size={26} /></div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">TechDebt Platform</h1>
          <p className="mt-1.5 text-sm text-slate-400">AWS Lifecycle & Technical Debt Intelligence</p>
        </div>
        <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-lg font-medium text-white">Sign in to AWS</h2>
          <p className="mt-1 text-sm text-slate-400">Use read-only Access Key credentials to connect your AWS account for discovery.</p>
          <form onSubmit={onLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Access Key ID</label>
              <input value={accessKey} onChange={e=>setAccessKey(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-amber-500/30 focus:border-amber-600 focus:ring-2" placeholder="AKIA..." autoComplete="off" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Secret Access Key</label>
              <input type="password" value={secretKey} onChange={e=>setSecretKey(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-amber-500/30 focus:border-amber-600 focus:ring-2" placeholder="Secret access key" autoComplete="new-password" required />
            </div>
            {error && <InlineAlert tone="error" message={error} />}
            <button type="submit" disabled={loading || !accessKey || !secretKey} className="btn-primary-glow inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50">{loading ? <><Loader2 size={16} className="animate-spin" />Signing in...</> : 'Sign in'}</button>
          </form>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Clock size={14}/>Credentials are validated via AWS STS. Read-only IAM permissions are recommended.</div>
        </div>
      </div>
    </div>
  )
}

function Protected({ children }: { children: ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppShell() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const logout = () => {
    localStorage.removeItem('aws_portal_logged_in')
    localStorage.removeItem('aws_account_id')
    notify({ tone: 'info', title: 'Signed out', description: 'You have been logged out of the portal.' })
    navigate('/login', { replace: true })
  }
  return (
    <Shell onLogout={logout}>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/resources/:id" element={<ResourceDetailPage />} />
        <Route path="/software" element={<SimplePage title="Software Inventory" subtitle="Discovered OS, packages, runtimes, and container components" body="Software inventory is collected via AWS Systems Manager Inventory, container image metadata, SBOM integrations (Syft/Trivy where configured), and Kubernetes APIs where authorized. EC2 instances without SSM management are reported as unmanaged with incomplete coverage." bullets={['Run scans and ensure SSM is enabled for EC2 coverage', 'Configure container/SBOM integrations where applicable', 'Review unmanaged instances and enrichment gaps']} />} />
        <Route path="/lifecycle" element={<LifecyclePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/analytics" element={<SimplePage title="Technical Debt Analytics" subtitle="Debt trends, exposure windows, and breakdowns" body="Analytics aggregate lifecycle urgency (30/60/90/180 day windows), unsupported resources, and remediation progress from persisted assessments and snapshots. Metrics are derived from real backend data and distinguish discovered vs lifecycle-assessed resources." bullets={['Track exposure by urgency window and service', 'Monitor unsupported and unknown-lifecycle resources', 'Measure remediation progress over time']} />} />
        <Route path="/risk" element={<SimplePage title="Risk Assessment" subtitle="Configurable lifecycle risk scoring with explainable factors" body="Risk considers EOS/EOL proximity, passed milestones, environment/criticality, security update availability, upgrade path, ownership, and lifecycle confidence. Lifecycle urgency is distinct from vulnerability severity; each assessment includes an explanation." bullets={['Configurable scoring weights and thresholds', 'Explainable risk factors per asset', 'Separate lifecycle urgency from vulnerability severity']} />} />
        <Route path="/remediation" element={<SimplePage title="Remediation Management" subtitle="Plan, assign, and track upgrades and risk acceptance" body="Create remediation records with owner/team, target upgrade, target date, notes, and status (Not Started, Planned, In Progress, Blocked, Completed, Risk Accepted). The platform is read-only with respect to AWS infrastructure." bullets={['Assign owners and target dates', 'Track status and blockers', 'Document risk acceptance decisions']} />} />
        <Route path="/coverage" element={<CoveragePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/sources" element={<SimplePage title="Lifecycle Data Sources" subtitle="Source precedence, synchronization status, and references" body="Configured sources include endoflife.date API v1 (implemented) with extensible adapters for AWS Health and official vendor sources. Precedence is configurable and conflicting dates are not silently overwritten; selected source and reasons are recorded." bullets={['Source precedence and conflict handling', 'Sync status and references per record', 'Extensible adapters for additional sources']} />} />
        <Route path="/teams" element={<SimplePage title="Teams & Ownership" subtitle="Ownership mapping, tag conventions, and unassigned resources" body="Ownership is derived from AWS tags (Owner/Team/Application/Environment), account metadata, naming rules, and manual overrides. A team registry and resource relationships support accountability for remediation." bullets={['Tag-based ownership discovery', 'Manual overrides and team registry', 'Identify unassigned resources']} />} />
        <Route path="/settings" element={<SimplePage title="Settings" subtitle="Collection schedules, thresholds, tag keys, and integrations" body="Configure AWS connection scope, collection schedules (inventory 24h, lifecycle 12h, recalculation daily by default), risk thresholds, ownership tag keys, and lifecycle source precedence. Environment-based configuration supports local and future cloud deployments." bullets={['Schedules and scan cadence', 'Risk and lifecycle thresholds', 'Ownership tags and source precedence']} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={isLoggedIn() ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/*" element={<Protected><AppShell /></Protected>} />
          </Routes>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
