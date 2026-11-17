import { BrowserRouter, Routes, Route, NavLink, useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import * as api from './api'
import {
  LayoutDashboard, Cloud, Server, Package, ShieldAlert, AlertTriangle, BarChart3,
  Wrench, Network, History, Database, Users, Settings, RefreshCw, Search, Play, LogOut,
  Activity, ChevronRight, CheckCircle2, Clock, XCircle
} from 'lucide-react'

const navGroups = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/watchlist', label: 'EOS/EOL Watchlist', icon: ShieldAlert },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/accounts', label: 'AWS Accounts', icon: Cloud },
      { to: '/resources', label: 'Resources', icon: Server },
      { to: '/software', label: 'Software', icon: Package },
    ],
  },
  {
    title: 'Lifecycle & Risk',
    items: [
      { to: '/lifecycle', label: 'Lifecycle Catalog', icon: Database },
      { to: '/analytics', label: 'Debt Analytics', icon: BarChart3 },
      { to: '/risk', label: 'Risk Assessment', icon: AlertTriangle },
      { to: '/remediation', label: 'Remediation', icon: Wrench },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/coverage', label: 'Collector Coverage', icon: Network },
      { to: '/history', label: 'Collection History', icon: History },
      { to: '/sources', label: 'Data Sources', icon: Database },
      { to: '/teams', label: 'Teams & Ownership', icon: Users },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

function StatCard({ label, value, hint, tone, icon: Icon }: { label: string; value: React.ReactNode; hint?: string; tone?: 'default'|'good'|'warn'|'critical'; icon?: any }) {
  const tones: any = {
    default: 'text-white',
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    critical: 'text-red-400',
  }
  const ring: any = {
    default: 'border-slate-800',
    good: 'border-emerald-900/40',
    warn: 'border-amber-900/40',
    critical: 'border-red-900/40',
  }
  return (
    <div className={`rounded-xl border bg-slate-900/60 p-4 ${ring[tone || 'default']}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
          <div className={`mt-2 text-2xl font-semibold ${tones[tone || 'default']}`}>{value}</div>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
        {Icon && <div className="rounded-lg bg-slate-800/80 p-2 text-amber-400"><Icon size={18} /></div>}
      </div>
    </div>
  )
}

function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
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

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default'|'good'|'warn'|'critical'|'info' }) {
  const cls = tone === 'good' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
    : tone === 'warn' ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
    : tone === 'critical' ? 'bg-red-950/60 text-red-300 border-red-800/60'
    : tone === 'info' ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
    : 'bg-slate-800 text-slate-300 border-slate-700'
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${cls}`}>{children}</span>
}

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-800 bg-slate-950/95 lg:flex lg:flex-col">
          <div className="border-b border-slate-800 px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400"><Activity size={18} /></div>
              <div>
                <div className="text-sm font-semibold text-white">TechDebt Platform</div>
                <div className="text-[11px] text-slate-500">AWS Lifecycle Intelligence</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-auto px-3 py-3">
            {navGroups.map(group => (
              <div key={group.title} className="mb-4">
                <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">{group.title}</div>
                <div className="space-y-1">
                  {group.items.map(item => {
                    const Icon = item.icon
                    return (
                      <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({isActive}) => `flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${isActive ? 'bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/20' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}>
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-slate-800 p-3">
            {onLogout && <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-300 hover:bg-slate-900 hover:text-white"><LogOut size={16} />Logout</button>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
            <div className="flex h-14 items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="hidden sm:inline">TechDebt Management Platform</span>
                <ChevronRight size={14} className="hidden sm:inline text-slate-600" />
                <span className="text-slate-300">Dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge tone="good">Read-only AWS</Badge>
                <span className="hidden md:inline">Real-time inventory & lifecycle intelligence</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

function OverviewPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['overview'], queryFn: api.getOverview })
  const pieOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { textStyle: { color: '#94a3b8' }, bottom: 0, icon: 'circle' },
    series: [{
      type: 'pie', radius: ['50%', '72%'], center: ['50%', '42%'],
      itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: data?.unsupported || 0, name: 'Unsupported', itemStyle: { color: '#ef4444' } },
        { value: data?.approaching_eol || 0, name: 'Approaching EOL', itemStyle: { color: '#f97316' } },
        { value: data?.approaching_eos || 0, name: 'Approaching EOS', itemStyle: { color: '#f59e0b' } },
        { value: data?.unknown_lifecycle || 0, name: 'Unknown', itemStyle: { color: '#64748b' } },
        { value: Math.max((data?.total_resources || 0) - (data?.outdated_technologies || 0) - (data?.unknown_lifecycle || 0), 0), name: 'Healthy/Other', itemStyle: { color: '#10b981' } },
      ]
    }]
  }), [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Organization-wide AWS technology lifecycle posture, inventory health, and technical debt exposure"
        actions={<button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"><RefreshCw size={14}/>Refresh</button>}
      />

      {isLoading && <Panel title="Loading" subtitle="Fetching latest dashboard metrics"><div className="text-slate-400">Loading overview...</div></Panel>}
      {error && <Panel title="Unable to load data" subtitle="Backend connection issue"><div className="text-red-400">Failed to load overview. Ensure the backend service is running and reachable.</div></Panel>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="AWS Accounts" value={data.total_accounts} hint={`${data.scanned_accounts} connected/scanned`} icon={Cloud} />
            <StatCard label="Discovered Resources" value={data.total_resources} hint={`${data.running_resources} in running state`} icon={Server} tone={data.total_resources ? 'default' : 'warn'} />
            <StatCard label="Unsupported / Past EOL" value={data.unsupported} hint="Requires immediate attention" icon={XCircle} tone={data.unsupported ? 'critical' : 'good'} />
            <StatCard label="Collection Coverage" value={`${data.collection_coverage?.percent || 0}%`} hint={`${data.collection_coverage?.fully_supported || 0}/${data.collection_coverage?.total_adapters || 0} adapters supported`} icon={CheckCircle2} tone={(data.collection_coverage?.percent || 0) >= 50 ? 'good' : 'warn'} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel title="Lifecycle Risk Distribution" subtitle="Based on matched lifecycle records (unknown/unassessed shown separately)" className="xl:col-span-2">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3"><ReactECharts option={pieOption} style={{ height: 300 }} /></div>
                <div className="space-y-3 lg:col-span-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 flex items-center justify-between"><span className="text-sm text-slate-300">Approaching EOS (≤90d)</span><Badge tone={data.approaching_eos ? 'warn' : 'good'}>{data.approaching_eos}</Badge></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 flex items-center justify-between"><span className="text-sm text-slate-300">Approaching EOL (≤90d)</span><Badge tone={data.approaching_eol ? 'warn' : 'good'}>{data.approaching_eol}</Badge></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 flex items-center justify-between"><span className="text-sm text-slate-300">Unsupported</span><Badge tone={data.unsupported ? 'critical' : 'good'}>{data.unsupported}</Badge></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 flex items-center justify-between"><span className="text-sm text-slate-300">Unknown lifecycle</span><Badge tone={data.unknown_lifecycle ? 'warn' : 'default'}>{data.unknown_lifecycle}</Badge></div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 flex items-center justify-between"><span className="text-sm text-slate-300">Outdated technologies</span><Badge tone={data.outdated_technologies ? 'warn' : 'good'}>{data.outdated_technologies}</Badge></div>
                </div>
              </div>
            </Panel>

            <Panel title="Latest Collection" subtitle="Most recent inventory scan status">
              {data.last_collection?.id ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-400">Run</span><span className="text-white">#{data.last_collection.id}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Status</span><Badge tone={String(data.last_collection.status).includes('error') ? 'critical' : 'warn'}>{String(data.last_collection.status)}</Badge></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-slate-400">Started</span><span className="text-slate-300 text-right text-xs">{String(data.last_collection.started_at || '')}</span></div>
                  <div>
                    <div className="mb-1 text-slate-400">Summary</div>
                    <pre className="max-h-44 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{JSON.stringify(data.last_collection.summary, null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
                  No collection runs yet. <Link to="/accounts" className="text-amber-400 hover:underline">Connect an AWS account</Link> and run a scan to populate dashboard data.
                </div>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link to="/watchlist" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-amber-700/40 hover:bg-slate-900 transition">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-amber-400"><ShieldAlert size={18}/><span className="font-medium text-white">EOS/EOL Watchlist</span></div><ChevronRight size={16} className="text-slate-500"/></div>
              <p className="mt-2 text-sm text-slate-400">Review technologies nearing or past lifecycle milestones and prioritize remediation.</p>
            </Link>
            <Link to="/resources" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-sky-700/40 hover:bg-slate-900 transition">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sky-400"><Server size={18}/><span className="font-medium text-white">Resource Inventory</span></div><ChevronRight size={16} className="text-slate-500"/></div>
              <p className="mt-2 text-sm text-slate-400">Search discovered AWS resources, states, versions, and enrichment details.</p>
            </Link>
            <Link to="/coverage" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-emerald-700/40 hover:bg-slate-900 transition">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-emerald-400"><Network size={18}/><span className="font-medium text-white">Collector Coverage</span></div><ChevronRight size={16} className="text-slate-500"/></div>
              <p className="mt-2 text-sm text-slate-400">Inspect adapter coverage, discovery breadth, and collection diagnostics.</p>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function AccountsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: api.getAccounts })
  const connectMut = useMutation({ mutationFn: (id:number)=>api.connectAccount(id), onSuccess: () => qc.invalidateQueries({queryKey:['accounts']}) })
  const scanMut = useMutation({ mutationFn: (id:number)=>api.scanAccount(id), onSuccess: () => { qc.invalidateQueries({queryKey:['overview']}); qc.invalidateQueries({queryKey:['resources']}); } })
  return (
    <div className="space-y-5">
      <PageHeader title="AWS Accounts" subtitle="Manage connected AWS accounts, discover regions, and run read-only inventory scans" />
      <Panel title="Connected Accounts" subtitle={`${data?.total || 0} account(s) registered`}>
        {isLoading ? <div className="text-slate-400">Loading...</div> : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800"><th className="py-2 pr-3 text-left">Account</th><th className="py-2 pr-3 text-left">Account ID</th><th className="py-2 pr-3 text-left">Status</th><th className="py-2 pr-3 text-left">Regions</th><th className="py-2 pr-3 text-left">Actions</th></tr></thead>
              <tbody>
                {(data?.items||[]).map((a:any)=>(
                  <tr key={a.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-3 font-medium text-white">{a.account_name || '-'}</td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-300">{a.account_id || '-'}</td>
                    <td className="py-3 pr-3"><Badge tone={a.last_connection_status==='connected'?'good':'warn'}>{a.last_connection_status || a.status || 'unknown'}</Badge>{a.last_error && <div className="mt-1 max-w-md truncate text-xs text-red-400" title={a.last_error}>{a.last_error}</div>}</td>
                    <td className="py-3 pr-3 text-slate-300">{a.regions_count}</td>
                    <td className="py-3 pr-3 space-x-2 whitespace-nowrap">
                      <button onClick={()=>connectMut.mutate(a.id)} className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs hover:bg-slate-800">Connect</button>
                      <button onClick={()=>scanMut.mutate(a.id)} className="inline-flex items-center gap-1 rounded-md border border-amber-700/50 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20"><Play size={12}/>Scan</button>
                    </td>
                  </tr>
                ))}
                {(!data?.items || data.items.length===0) && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No accounts connected yet. Sign in from the portal login page to connect an AWS account.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {(scanMut.data || scanMut.error) && <pre className="mt-4 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">{JSON.stringify(scanMut.data || (scanMut.error as any)?.response?.data || String(scanMut.error), null, 2)}</pre>}
      </Panel>
    </div>
  )
}

function ResourcesPage() {
  const [q, setQ] = useState('')
  const { data, isLoading, refetch } = useQuery({ queryKey: ['resources', q], queryFn: () => api.getResources(q ? { q } : {}) })
  return (
    <div className="space-y-5">
      <PageHeader title="Resource Inventory" subtitle="Discovered AWS resources across accounts and regions" />
      <Panel title="Resources" subtitle={`Total: ${data?.total || 0}`} action={
        <div className="flex gap-2"><div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" /><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, ID, ARN..." className="w-56 rounded-lg border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-sm" /></div><button onClick={()=>refetch()} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">Search</button></div>
      }>
        {isLoading ? <div className="text-slate-400">Loading resources...</div> : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800">
                <th className="py-2 pr-3 text-left">Name / ID</th><th className="py-2 pr-3 text-left">Service</th><th className="py-2 pr-3 text-left">Type</th><th className="py-2 pr-3 text-left">Account</th><th className="py-2 pr-3 text-left">Region</th><th className="py-2 pr-3 text-left">State</th><th className="py-2 pr-3 text-left">Version</th>
              </tr></thead>
              <tbody>
                {(data?.items||[]).map((r:any)=>(
                  <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="py-3 pr-3"><Link to={`/resources/${r.id}`} className="font-medium text-sky-400 hover:underline">{r.name || r.resource_id}</Link><div className="max-w-xs truncate font-mono text-xs text-slate-500" title={r.arn || r.resource_id}>{r.arn || r.resource_id}</div></td>
                    <td className="py-3 pr-3 text-slate-300">{r.service}</td>
                    <td className="py-3 pr-3 text-xs text-slate-400">{r.resource_type}</td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-300">{r.account_id || '-'}</td>
                    <td className="py-3 pr-3 text-slate-300">{r.region || 'global'}</td>
                    <td className="py-3 pr-3"><Badge tone={r.normalized_state==='Running'||r.normalized_state==='Available'?'good':r.normalized_state==='Stopped'?'warn':'default'}>{r.normalized_state || 'Unknown'}</Badge></td>
                    <td className="py-3 pr-3 text-xs text-slate-400">{r.version_info ? JSON.stringify(r.version_info) : '-'}</td>
                  </tr>
                ))}
                {(!data?.items || data.items.length===0) && <tr><td colSpan={7} className="py-10 text-center text-slate-500">No resources discovered yet. Run an account scan to populate inventory.</td></tr>}
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
  const { data, isLoading } = useQuery({ queryKey: ['resource', id], queryFn: () => api.getResource(Number(id)) })
  if (isLoading) return <div className="text-slate-400">Loading...</div>
  if (!data || data.error) return <div className="text-red-400">Resource not found.</div>
  return (
    <div className="space-y-5">
      <PageHeader title={data.name || data.resource_id} subtitle={`${data.resource_type} · ${data.region || 'global'} · ${data.account?.account_id || ''}`} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Overview" subtitle="Resource metadata and state">
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-400">ARN:</span> <span className="break-all font-mono text-xs text-slate-300">{data.arn || '-'}</span></div>
            <div><span className="text-slate-400">State:</span> <Badge tone={data.normalized_state==='Running'||data.normalized_state==='Available'?'good':data.normalized_state==='Stopped'?'warn':'default'}>{data.normalized_state || 'Unknown'}</Badge> {data.original_state ? <span className="text-slate-500">(AWS: {data.original_state})</span> : ''}</div>
            <div><span className="text-slate-400">Discovery:</span> <span className="text-slate-300">{data.discovery_source}</span></div>
            <div><span className="text-slate-400">Enrichment:</span> <span className="text-slate-300">{data.enrichment_status} / {data.data_completeness}</span></div>
            <div><span className="text-slate-400">Version info:</span></div>
            <pre className="overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{JSON.stringify(data.version_info, null, 2)}</pre>
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
  const { data, isLoading } = useQuery({ queryKey: ['lifecycle-products'], queryFn: () => api.getLifecycleProducts({ limit: 100 }) })
  const syncMut = useMutation({ mutationFn: () => api.syncLifecycle(50), onSuccess: () => qc.invalidateQueries({queryKey:['lifecycle-products']}) })
  return (
    <div className="space-y-5">
      <PageHeader title="Lifecycle Catalog" subtitle="Normalized lifecycle data from endoflife.date and extensible sources" actions={<button onClick={()=>syncMut.mutate()} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400"><RefreshCw size={14}/>{syncMut.isPending?'Syncing...':'Sync endoflife.date'}</button>} />
      {syncMut.data && <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-3 text-sm text-emerald-300">Sync complete: {JSON.stringify(syncMut.data)}</div>}
      <Panel title="Products" subtitle={`Total: ${data?.total || 0}`}>
        {isLoading ? <div className="text-slate-400">Loading...</div> : (
          <div className="overflow-auto"><table className="w-full text-sm"><thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800"><th className="py-2 pr-3 text-left">Product</th><th className="py-2 pr-3 text-left">Slug</th><th className="py-2 pr-3 text-left">Vendor</th><th className="py-2 pr-3 text-left">Aliases</th></tr></thead>
            <tbody>
              {(data?.items||[]).map((p:any)=>(<tr key={p.id} className="border-b border-slate-800/60"><td className="py-3 pr-3 font-medium text-white">{p.title}</td><td className="py-3 pr-3 font-mono text-xs text-slate-400">{p.slug}</td><td className="py-3 pr-3 text-slate-300">{p.vendor || '-'}</td><td className="py-3 pr-3 text-xs text-slate-400">{(p.aliases||[]).join(', ') || '-'}</td></tr>))}
              {(!data?.items || data.items.length===0) && <tr><td colSpan={4} className="py-10 text-center text-slate-500">No lifecycle products synced yet. Click “Sync endoflife.date”.</td></tr>}
            </tbody></table></div>
        )}
      </Panel>
    </div>
  )
}

function CoveragePage() {
  const { data, isLoading } = useQuery({ queryKey: ['coverage'], queryFn: api.getCoverage })
  const { data: errors } = useQuery({ queryKey: ['coll-errors'], queryFn: api.getCollectionErrors })
  return (
    <div className="space-y-5">
      <PageHeader title="Collector Coverage" subtitle="Adapter registry, discovery breadth, and collection diagnostics" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Coverage Matrix" subtitle={`${data?.total || 0} resource types tracked`} className="xl:col-span-2">
          {isLoading ? <div className="text-slate-400">Loading...</div> : (
            <div className="overflow-auto"><table className="w-full text-sm"><thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800"><th className="py-2 pr-3 text-left">Service</th><th className="py-2 pr-3 text-left">Resource Type</th><th className="py-2 pr-3 text-left">Source</th><th className="py-2 pr-3 text-left">Status</th><th className="py-2 pr-3 text-left">Version</th><th className="py-2 pr-3 text-left">Last Collection</th></tr></thead>
              <tbody>
                {(data?.items||[]).map((c:any,i:number)=>(<tr key={i} className="border-b border-slate-800/60"><td className="py-2.5 pr-3 text-slate-200">{c.aws_service}</td><td className="py-2.5 pr-3 text-xs text-slate-400">{c.resource_type}</td><td className="py-2.5 pr-3 text-slate-300">{c.discovery_source}</td><td className="py-2.5 pr-3"><Badge tone={c.coverage_status==='Fully Supported'?'good':c.coverage_status==='Collection Failed'?'critical':'warn'}>{c.coverage_status}</Badge></td><td className="py-2.5 pr-3">{c.version_support?'Yes':'No'}</td><td className="py-2.5 pr-3 text-xs text-slate-500">{c.last_collection_at ? String(c.last_collection_at) : '-'}</td></tr>))}
                {(!data?.items || data.items.length===0) && <tr><td colSpan={6} className="py-10 text-center text-slate-500">No coverage records yet.</td></tr>}
              </tbody></table></div>
          )}
        </Panel>
        <Panel title="Recent Errors" subtitle="Collection diagnostics">
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {(errors?.items||[]).slice(0,20).map((e:any)=>(<div key={e.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs"><div className="text-amber-300">{e.service} {e.resource_type || ''} {e.region ? `· ${e.region}`:''}</div><div className="mt-1 break-words text-slate-300">{e.message}</div><div className="mt-1 text-slate-500">{e.error_type} · {String(e.occurred_at)}</div></div>))}
            {(!errors?.items || errors.items.length===0) && <div className="text-sm text-slate-500">No errors recorded.</div>}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ['runs'], queryFn: api.getCollectionsRuns })
  return (
    <div className="space-y-5">
      <PageHeader title="Collection History" subtitle="Inventory scan runs and summaries" />
      <Panel title="Runs" subtitle={`${data?.total || 0} recorded`}>
        {isLoading ? <div className="text-slate-400">Loading...</div> : (
          <div className="overflow-auto"><table className="w-full text-sm"><thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800"><th className="py-2 pr-3 text-left">Run</th><th className="py-2 pr-3 text-left">Account</th><th className="py-2 pr-3 text-left">Status</th><th className="py-2 pr-3 text-left">Started</th><th className="py-2 pr-3 text-left">Summary</th></tr></thead>
            <tbody>
              {(data?.items||[]).map((r:any)=>(<tr key={r.id} className="border-b border-slate-800/60 align-top"><td className="py-3 pr-3 text-white">#{r.id}</td><td className="py-3 pr-3 text-slate-300">{r.account_id ?? '-'}</td><td className="py-3 pr-3"><Badge tone={String(r.status).includes('fail')||String(r.status).includes('error')?'critical':'good'}>{r.status}</Badge></td><td className="py-3 pr-3 text-xs text-slate-400">{String(r.started_at)}</td><td className="py-3 pr-3"><pre className="whitespace-pre-wrap text-xs text-slate-300">{JSON.stringify(r.summary, null, 2)}</pre></td></tr>))}
              {(!data?.items || data.items.length===0) && <tr><td colSpan={5} className="py-10 text-center text-slate-500">No collection runs recorded.</td></tr>}
            </tbody></table></div>
        )}
      </Panel>
    </div>
  )
}

function WatchlistPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['watchlist'], queryFn: api.getWatchlist })
  const recompute = useMutation({ mutationFn: api.recomputeMatches, onSuccess: () => { qc.invalidateQueries({queryKey:['watchlist']}); qc.invalidateQueries({queryKey:['overview']}) } })
  return (
    <div className="space-y-5">
      <PageHeader title="EOS/EOL Watchlist" subtitle="Technologies approaching or past lifecycle milestones with independent EOS/EOL countdowns" actions={<button onClick={()=>recompute.mutate()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800">{recompute.isPending?'Computing...':'Recompute Matches'}</button>} />
      {recompute.data && <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-3 text-xs text-emerald-300">Recompute: {JSON.stringify(recompute.data)}</div>}
      <Panel title="Watchlist" subtitle="Sorted by nearest upcoming milestones">
        {isLoading ? <div className="text-slate-400">Loading...</div> : (
          <div className="overflow-auto"><table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr className="border-b border-slate-800">
              <th className="py-2 pr-3 text-left">Resource</th><th className="py-2 pr-3 text-left">Service/Type</th><th className="py-2 pr-3 text-left">Technology</th><th className="py-2 pr-3 text-left">Version</th><th className="py-2 pr-3 text-left">Account/Region</th><th className="py-2 pr-3 text-left">EOS</th><th className="py-2 pr-3 text-left">EOL</th><th className="py-2 pr-3 text-left">Risk</th><th className="py-2 pr-3 text-left">Match</th>
            </tr></thead>
            <tbody>
              {(data?.items||[]).map((m:any)=>(
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
              {(!data?.items || data.items.length===0) && <tr><td colSpan={9} className="py-10 text-center text-slate-500">No lifecycle matches yet. Connect an account, run a scan, sync lifecycle data, then recompute matches.</td></tr>}
            </tbody>
          </table></div>
        )}
      </Panel>
    </div>
  )
}

function SimplePage({ title, subtitle, body }: { title: string; subtitle: string; body: string }) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={subtitle} />
      <Panel title={title} subtitle="Status & information">
        <p className="text-sm leading-6 text-slate-300">{body}</p>
      </Panel>
    </div>
  )
}

function isLoggedIn() {
  return localStorage.getItem('aws_portal_logged_in') === 'true'
}

function LoginPage() {
  const navigate = useNavigate()
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
      if (connectRes && connectRes.ok === false) throw new Error(connectRes.error || 'Connected account created but AWS connection failed')
      localStorage.setItem('aws_portal_logged_in', 'true')
      if (acct?.id) localStorage.setItem('aws_account_id', String(acct.id))
      navigate('/', { replace: true })
    } catch (err: any) {
      const status = err?.response?.status
      const dataMsg = err?.response?.data?.detail || err?.response?.data?.error
      const msg = dataMsg || err?.message || 'Login failed'
      const hint = status === 502 || err?.code === 'ERR_BAD_RESPONSE' ? ' (Backend unavailable or proxy error — ensure backend is running and reachable)' : ''
      setError((typeof msg === 'string' ? msg : JSON.stringify(msg)) + hint)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400"><Activity size={24} /></div>
          <h1 className="text-2xl font-semibold text-white">TechDebt Platform</h1>
          <p className="mt-1 text-sm text-slate-400">AWS Lifecycle & Technical Debt Intelligence</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-lg font-medium text-white">Sign in to AWS</h2>
          <p className="mt-1 text-sm text-slate-400">Use your Access Key ID and Secret Access Key (read-only recommended).</p>
          <form onSubmit={onLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Access Key ID</label>
              <input value={accessKey} onChange={e=>setAccessKey(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" placeholder="AKIA..." autoComplete="off" required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Secret Access Key</label>
              <input type="password" value={secretKey} onChange={e=>setSecretKey(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" placeholder="Secret access key" autoComplete="new-password" required />
            </div>
            {error && <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300 break-words">{error}</div>}
            <button type="submit" disabled={loading || !accessKey || !secretKey} className="w-full rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50">{loading ? 'Signing in...' : 'Login'}</button>
          </form>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Clock size={14}/>Credentials are validated via AWS STS for read-only discovery.</div>
        </div>
      </div>
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppShell() {
  const navigate = useNavigate()
  const logout = () => {
    localStorage.removeItem('aws_portal_logged_in')
    localStorage.removeItem('aws_account_id')
    navigate('/login', { replace: true })
  }
  return (
    <Shell onLogout={logout}>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/resources/:id" element={<ResourceDetailPage />} />
        <Route path="/software" element={<SimplePage title="Software Inventory" subtitle="Discovered OS, packages, runtimes, and container components" body="Software inventory is collected via AWS Systems Manager Inventory, container image metadata, SBOM integrations (Syft/Trivy where configured), and Kubernetes APIs where authorized. EC2 instances without SSM management are reported as unmanaged with incomplete coverage. Run scans and configure SSM/collector integrations to populate this view." />} />
        <Route path="/lifecycle" element={<LifecyclePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/analytics" element={<SimplePage title="Technical Debt Analytics" subtitle="Debt trends, exposure windows, and breakdowns" body="Analytics aggregate lifecycle urgency (30/60/90/180 day windows), unsupported resources, and remediation progress from persisted assessments and snapshots. Metrics are derived from real backend data and distinguish discovered vs lifecycle-assessed resources." />} />
        <Route path="/risk" element={<SimplePage title="Risk Assessment" subtitle="Configurable lifecycle risk scoring with explainable factors" body="Risk considers EOS/EOL proximity, passed milestones, environment/criticality, security update availability, upgrade path, ownership, and lifecycle confidence. Lifecycle urgency is distinct from vulnerability severity; each assessment includes an explanation." />} />
        <Route path="/remediation" element={<SimplePage title="Remediation Management" subtitle="Plan, assign, and track upgrades and risk acceptance" body="Create remediation records with owner/team, target upgrade, target date, notes, and status (Not Started, Planned, In Progress, Blocked, Completed, Risk Accepted). The platform is read-only with respect to AWS infrastructure." />} />
        <Route path="/coverage" element={<CoveragePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/sources" element={<SimplePage title="Lifecycle Data Sources" subtitle="Source precedence, synchronization status, and references" body="Configured sources include endoflife.date API v1 (implemented) with extensible adapters for AWS Health and official vendor sources. Precedence is configurable and conflicting dates are not silently overwritten; selected source and reasons are recorded." />} />
        <Route path="/teams" element={<SimplePage title="Teams & Ownership" subtitle="Ownership mapping, tag conventions, and unassigned resources" body="Ownership is derived from AWS tags (Owner/Team/Application/Environment), account metadata, naming rules, and manual overrides. A team registry and resource relationships support accountability for remediation." />} />
        <Route path="/settings" element={<SimplePage title="Settings" subtitle="Collection schedules, thresholds, tag keys, and integrations" body="Configure AWS connection scope, collection schedules (inventory 24h, lifecycle 12h, recalculation daily by default), risk thresholds, ownership tag keys, and lifecycle source precedence. Environment-based configuration supports local and future cloud deployments." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isLoggedIn() ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/*" element={<Protected><AppShell /></Protected>} />
      </Routes>
    </BrowserRouter>
  )
}
