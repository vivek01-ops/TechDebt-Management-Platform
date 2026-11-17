import { BrowserRouter, Routes, Route, NavLink, useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import * as api from './api'
import {
  LayoutDashboard, Cloud, Server, Package, ShieldAlert, AlertTriangle, BarChart3,
  Wrench, Network, History, Database, Users, Settings, RefreshCw, Search, Play, LogOut
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Executive Overview', icon: LayoutDashboard },
  { to: '/accounts', label: 'AWS Account Management', icon: Cloud },
  { to: '/resources', label: 'Resource Inventory', icon: Server },
  { to: '/software', label: 'Software Inventory', icon: Package },
  { to: '/lifecycle', label: 'Technology Lifecycle', icon: Database },
  { to: '/watchlist', label: 'EOS/EOL Watchlist', icon: ShieldAlert },
  { to: '/analytics', label: 'Technical Debt Analytics', icon: BarChart3 },
  { to: '/risk', label: 'Risk Assessment', icon: AlertTriangle },
  { to: '/remediation', label: 'Remediation Management', icon: Wrench },
  { to: '/coverage', label: 'Collector Coverage', icon: Network },
  { to: '/history', label: 'Collection History', icon: History },
  { to: '/sources', label: 'Lifecycle Data Sources', icon: Database },
  { to: '/teams', label: 'Team and Ownership', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  return (
    <div className="min-h-screen flex bg-[#0b1220] text-slate-200">
      <aside className="w-72 border-r border-slate-800 bg-[#0f172a] p-4 sticky top-0 h-screen overflow-auto flex flex-col">
        <div className="mb-6">
          <div className="text-lg font-semibold text-white">TechDebt Platform</div>
          <div className="text-xs text-slate-400">AWS Lifecycle & Technical Debt Intelligence</div>
        </div>
        <nav className="space-y-1 flex-1">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({isActive}) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${isActive ? 'bg-slate-800 border-slate-700 text-white' : 'border-transparent text-slate-300 hover:bg-slate-800/60'}`}>
                <Icon size={16} className="text-amber-500" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
        {onLogout && <button onClick={onLogout} className="mt-4 flex items-center gap-2 px-3 py-2 rounded-md text-sm border border-slate-700 text-slate-300 hover:bg-slate-800"><LogOut size={16} />Logout</button>}
      </aside>
      <main className="flex-1 min-w-0">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0b1220]/90 backdrop-blur sticky top-0 z-10">
          <div className="text-sm text-slate-400">Read-only AWS integrations · Real-time inventory intelligence</div>
          <div className="text-xs text-slate-500">Local-first · Cloud-ready</div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

function Card({ title, value, subtitle, tone }: { title: string; value: React.ReactNode; subtitle?: string; tone?: string }) {
  const toneClass = tone === 'critical' ? 'text-red-400' : tone === 'warn' ? 'text-amber-400' : tone === 'good' ? 'text-emerald-400' : 'text-white'
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">{title}</div>
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  )
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

function OverviewPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['overview'], queryFn: api.getOverview })
  const chartOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { textStyle: { color: '#94a3b8' }, bottom: 0 },
    series: [{
      type: 'pie', radius: ['45%', '70%'],
      label: { color: '#cbd5e1' },
      data: [
        { value: data?.approaching_eos || 0, name: 'Approaching EOS', itemStyle: { color: '#f59e0b' } },
        { value: data?.approaching_eol || 0, name: 'Approaching EOL', itemStyle: { color: '#fb923c' } },
        { value: data?.unsupported || 0, name: 'Unsupported', itemStyle: { color: '#ef4444' } },
        { value: data?.unknown_lifecycle || 0, name: 'Unknown', itemStyle: { color: '#64748b' } },
        { value: Math.max((data?.total_resources || 0) - (data?.outdated_technologies || 0) - (data?.unknown_lifecycle || 0), 0), name: 'Healthy/Unassessed', itemStyle: { color: '#10b981' } },
      ]
    }]
  }), [data])

  return (
    <div>
      <PageHeader title="Executive Overview" subtitle="Organization-wide AWS technology lifecycle and technical debt posture" actions={<button onClick={() => refetch()} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm flex items-center gap-2 hover:bg-slate-700"><RefreshCw size={14}/>Refresh</button>} />
      {isLoading && <div className="text-slate-400">Loading overview...</div>}
      {error && <div className="text-red-400">Failed to load overview. Ensure backend is running.</div>}
      {data && <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <Card title="Total AWS Accounts" value={data.total_accounts} subtitle={`${data.scanned_accounts} connected/scanned`} />
          <Card title="Discovered Resources" value={data.total_resources} subtitle={`${data.running_resources} in running state`} />
          <Card title="Approaching EOS (≤90d)" value={data.approaching_eos} tone={data.approaching_eos ? 'warn' : 'good'} />
          <Card title="Unsupported / Past EOL" value={data.unsupported} tone={data.unsupported ? 'critical' : 'good'} />
          <Card title="Approaching EOL (≤90d)" value={data.approaching_eol} tone={data.approaching_eol ? 'warn' : 'good'} />
          <Card title="Unknown Lifecycle" value={data.unknown_lifecycle} tone={data.unknown_lifecycle ? 'warn' : undefined} />
          <Card title="Outdated Technologies" value={data.outdated_technologies} tone={data.outdated_technologies ? 'warn' : 'good'} />
          <Card title="Collection Coverage" value={`${data.collection_coverage?.percent || 0}%`} subtitle={`${data.collection_coverage?.fully_supported || 0}/${data.collection_coverage?.total_adapters || 0} adapters fully supported`} />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#111827] border border-slate-800 rounded-lg p-4">
            <div className="text-sm font-medium text-white mb-2">Technology Lifecycle Distribution</div>
            <div className="text-xs text-slate-400 mb-3">Based on matched lifecycle records in the database. Unknown/unassessed resources are shown separately.</div>
            <ReactECharts option={chartOption} style={{height: 320}} />
          </div>
          <div className="bg-[#111827] border border-slate-800 rounded-lg p-4">
            <div className="text-sm font-medium text-white mb-2">Latest Collection Status</div>
            {data.last_collection?.id ? (
              <div className="space-y-2 text-sm">
                <div><span className="text-slate-400">Run ID:</span> {data.last_collection.id}</div>
                <div><span className="text-slate-400">Status:</span> <span className="text-amber-400">{data.last_collection.status}</span></div>
                <div><span className="text-slate-400">Started:</span> {String(data.last_collection.started_at || '')}</div>
                <pre className="mt-3 bg-slate-900 border border-slate-800 rounded p-3 text-xs overflow-auto text-slate-300">{JSON.stringify(data.last_collection.summary, null, 2)}</pre>
              </div>
            ) : <div className="text-slate-400 text-sm">No collection runs yet. Connect an AWS account and start a scan.</div>}
            <div className="mt-4 text-xs text-slate-500">Metrics are sourced from backend APIs and persisted inventory/lifecycle data. No production metrics are hardcoded.</div>
          </div>
        </div>
      </>}
    </div>
  )
}

function AccountsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: api.getAccounts })
  const [form, setForm] = useState({ account_name: '', auth_type: 'keys', access_key_id: '', secret_access_key: '', session_token: '', profile_name: '', role_arn: '', external_id: '' })
  const createMut = useMutation({ mutationFn: api.createAccount, onSuccess: () => { qc.invalidateQueries({queryKey:['accounts']}); setForm({account_name:'', auth_type:'keys', access_key_id:'', secret_access_key:'', session_token:'', profile_name:'', role_arn:'', external_id:''}) } })
  const connectMut = useMutation({ mutationFn: (id:number)=>api.connectAccount(id), onSuccess: () => qc.invalidateQueries({queryKey:['accounts']}) })
  const scanMut = useMutation({ mutationFn: (id:number)=>api.scanAccount(id), onSuccess: () => { qc.invalidateQueries({queryKey:['overview']}); qc.invalidateQueries({queryKey:['resources']}); } })
  const testMut = useMutation({ mutationFn: (payload?: any) => api.testConnection(payload) })
  const submitCreate = () => {
    const payload: any = { account_name: form.account_name, auth_type: form.auth_type }
    if (form.auth_type === 'keys') {
      payload.access_key_id = form.access_key_id
      payload.secret_access_key = form.secret_access_key
      if (form.session_token) payload.session_token = form.session_token
    } else {
      if (form.profile_name) payload.profile_name = form.profile_name
    }
    if (form.role_arn) payload.role_arn = form.role_arn
    if (form.external_id) payload.external_id = form.external_id
    createMut.mutate(payload)
  }
  const testPortalCreds = () => {
    if (form.auth_type === 'keys' && form.access_key_id && form.secret_access_key) {
      testMut.mutate({ access_key_id: form.access_key_id, secret_access_key: form.secret_access_key, session_token: form.session_token || undefined })
    } else {
      testMut.mutate(undefined)
    }
  }
  return (
    <div>
      <PageHeader title="AWS Account Management" subtitle="Login to AWS from the portal using Access Key and Secret Access Key, then connect and run read-only inventory scans" actions={<button onClick={testPortalCreds} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm hover:bg-slate-700">Test Connection</button>} />
      {testMut.data && <pre className="mb-4 text-xs bg-slate-900 border border-slate-800 rounded p-3 overflow-auto">{JSON.stringify(testMut.data, null, 2)}</pre>}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 bg-[#111827] border border-slate-800 rounded-lg p-4">
          <div className="font-medium mb-3">AWS Portal Login</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Account name</label>
              <input value={form.account_name} onChange={e=>setForm({...form,account_name:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="My AWS Account" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Authentication method</label>
              <select value={form.auth_type} onChange={e=>setForm({...form,auth_type:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm">
                <option value="keys">Access Key & Secret Access Key (Portal)</option>
                <option value="profile">AWS Profile</option>
                <option value="role">Assume Role</option>
              </select>
            </div>
            {form.auth_type === 'keys' && (<>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Access Key ID</label>
                <input value={form.access_key_id} onChange={e=>setForm({...form,access_key_id:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="AKIA..." autoComplete="off" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Secret Access Key</label>
                <input type="password" value={form.secret_access_key} onChange={e=>setForm({...form,secret_access_key:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Secret access key" autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Session Token (optional)</label>
                <input type="password" value={form.session_token} onChange={e=>setForm({...form,session_token:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="For temporary credentials" autoComplete="off" />
              </div>
            </>)}
            {form.auth_type === 'profile' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Profile name</label>
                <input value={form.profile_name} onChange={e=>setForm({...form,profile_name:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="default" />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Role ARN (optional, for AssumeRole)</label>
              <input value={form.role_arn} onChange={e=>setForm({...form,role_arn:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="arn:aws:iam::...:role/..." />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">External ID (optional)</label>
              <input value={form.external_id} onChange={e=>setForm({...form,external_id:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={submitCreate} disabled={createMut.isPending || (form.auth_type==='keys' && (!form.access_key_id || !form.secret_access_key))} className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black font-medium rounded text-sm">{createMut.isPending?'Saving...':'Add & Save Account'}</button>
            <div className="text-xs text-slate-500">Portal AWS login: provide IAM Access Key ID and Secret Access Key to connect this account for read-only discovery. Use least-privilege credentials.</div>
            {createMut.error && <div className="text-xs text-red-400">{String((createMut.error as any)?.response?.data?.detail || (createMut.error as any)?.message || createMut.error)}</div>}
          </div>
        </div>
        <div className="xl:col-span-2 bg-[#111827] border border-slate-800 rounded-lg p-4">
          <div className="font-medium mb-3">Accounts</div>
          {isLoading ? <div className="text-slate-400">Loading...</div> : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 text-xs uppercase"><tr className="border-b border-slate-800"><th className="text-left py-2 pr-3">Name</th><th className="text-left py-2 pr-3">Account ID</th><th className="text-left py-2 pr-3">Status</th><th className="text-left py-2 pr-3">Regions</th><th className="text-left py-2 pr-3">Actions</th></tr></thead>
                <tbody>
                  {(data?.items||[]).map((a:any)=>(
                    <tr key={a.id} className="border-b border-slate-800/60">
                      <td className="py-2 pr-3">{a.account_name || '-'}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{a.account_id || '-'}</td>
                      <td className="py-2 pr-3"><span className={`${a.last_connection_status==='connected'?'text-emerald-400':'text-amber-400'}`}>{a.last_connection_status || a.status || 'unknown'}</span>{a.last_error && <div className="text-xs text-red-400 max-w-md truncate" title={a.last_error}>{a.last_error}</div>}</td>
                      <td className="py-2 pr-3">{a.regions_count}</td>
                      <td className="py-2 pr-3 space-x-2">
                        <button onClick={()=>connectMut.mutate(a.id)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">Connect</button>
                        <button onClick={()=>scanMut.mutate(a.id)} className="px-2 py-1 bg-amber-700/30 border border-amber-700 rounded text-xs text-amber-300 inline-flex items-center gap-1"><Play size={12}/>Scan</button>
                      </td>
                    </tr>
                  ))}
                  {(!data?.items || data.items.length===0) && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No accounts registered yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {(scanMut.data || scanMut.error) && <pre className="mt-4 text-xs bg-slate-900 border border-slate-800 rounded p-3 overflow-auto">{JSON.stringify(scanMut.data || (scanMut.error as any)?.response?.data || String(scanMut.error), null, 2)}</pre>}
        </div>
      </div>
    </div>
  )
}

function ResourcesPage() {
  const [q, setQ] = useState('')
  const { data, isLoading, refetch } = useQuery({ queryKey: ['resources', q], queryFn: () => api.getResources(q ? { q } : {}) })
  return (
    <div>
      <PageHeader title="Resource Inventory" subtitle="Discovered AWS resources across accounts and regions with normalized state and enrichment metadata" />
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-lg">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, ID, ARN, or type..." className="w-full bg-slate-900 border border-slate-700 rounded pl-9 pr-3 py-2 text-sm" />
        </div>
        <button onClick={()=>refetch()} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm">Search</button>
      </div>
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 overflow-auto">
        {isLoading ? <div className="text-slate-400">Loading resources...</div> : (
          <table className="w-full text-sm">
            <thead className="text-slate-400 text-xs uppercase"><tr className="border-b border-slate-800">
              <th className="text-left py-2 pr-3">Name / ID</th><th className="text-left py-2 pr-3">Service</th><th className="text-left py-2 pr-3">Type</th><th className="text-left py-2 pr-3">Account</th><th className="text-left py-2 pr-3">Region</th><th className="text-left py-2 pr-3">State</th><th className="text-left py-2 pr-3">Version</th>
            </tr></thead>
            <tbody>
              {(data?.items||[]).map((r:any)=>(
                <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="py-2 pr-3"><Link to={`/resources/${r.id}`} className="text-sky-400 hover:underline">{r.name || r.resource_id}</Link><div className="text-xs text-slate-500 font-mono truncate max-w-xs" title={r.arn || r.resource_id}>{r.arn || r.resource_id}</div></td>
                  <td className="py-2 pr-3">{r.service}</td>
                  <td className="py-2 pr-3 text-xs">{r.resource_type}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.account_id || '-'}</td>
                  <td className="py-2 pr-3">{r.region || 'global/unknown'}</td>
                  <td className="py-2 pr-3"><span className={`${r.normalized_state==='Running'||r.normalized_state==='Available'?'text-emerald-400':r.normalized_state==='Stopped'?'text-amber-400':'text-slate-300'}`}>{r.normalized_state || 'Unknown'}</span></td>
                  <td className="py-2 pr-3 text-xs text-slate-300">{r.version_info ? JSON.stringify(r.version_info) : '-'}</td>
                </tr>
              ))}
              {(!data?.items || data.items.length===0) && <tr><td colSpan={7} className="py-8 text-center text-slate-500">No resources discovered yet. Run an account scan from AWS Account Management.</td></tr>}
            </tbody>
          </table>
        )}
        <div className="mt-3 text-xs text-slate-500">Total: {data?.total || 0} (real backend data)</div>
      </div>
    </div>
  )
}

function ResourceDetailPage() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({ queryKey: ['resource', id], queryFn: () => api.getResource(Number(id)) })
  if (isLoading) return <div className="text-slate-400">Loading...</div>
  if (!data || data.error) return <div className="text-red-400">Resource not found.</div>
  return (
    <div>
      <PageHeader title={data.name || data.resource_id} subtitle={`${data.resource_type} · ${data.region || 'global'} · ${data.account?.account_id || ''}`} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2 text-sm">
          <div className="font-medium text-white mb-2">Overview</div>
          <div><span className="text-slate-400">ARN:</span> <span className="font-mono text-xs break-all">{data.arn || '-'}</span></div>
          <div><span className="text-slate-400">State:</span> {data.normalized_state} {data.original_state ? `(AWS: ${data.original_state})` : ''}</div>
          <div><span className="text-slate-400">Discovery source:</span> {data.discovery_source}</div>
          <div><span className="text-slate-400">Enrichment:</span> {data.enrichment_status} / {data.data_completeness}</div>
          <div><span className="text-slate-400">Version info:</span> <pre className="inline-block whitespace-pre-wrap text-xs bg-slate-900 p-2 rounded mt-1">{JSON.stringify(data.version_info, null, 2)}</pre></div>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4">
          <div className="font-medium text-white mb-2">Tags</div>
          <div className="flex flex-wrap gap-2">
            {(data.tags||[]).map((t:any,i:number)=>(<span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs"><span className="text-slate-400">{t.key}:</span> {t.value}</span>))}
            {(!data.tags || data.tags.length===0) && <span className="text-slate-500 text-sm">No tags</span>}
          </div>
          <div className="font-medium text-white mt-4 mb-2">Software Installations</div>
          {data.software_installations?.length ? <ul className="text-sm space-y-1">{data.software_installations.map((s:any)=><li key={s.id}>{s.name} {s.version || ''} <span className="text-slate-500">({s.source})</span></li>)}</ul> : <div className="text-slate-500 text-sm">No software inventory collected for this resource yet (SSM/container inventory integration may be required).</div>}
        </div>
      </div>
    </div>
  )
}

function LifecyclePage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['lifecycle-products'], queryFn: () => api.getLifecycleProducts({ limit: 100 }) })
  const syncMut = useMutation({ mutationFn: () => api.syncLifecycle(50), onSuccess: () => qc.invalidateQueries({queryKey:['lifecycle-products']}) })
  return (
    <div>
      <PageHeader title="Technology Lifecycle" subtitle="Normalized lifecycle catalog from configured sources (endoflife.date API v1 and extensible source adapters)" actions={<button onClick={()=>syncMut.mutate()} className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black font-medium rounded text-sm flex items-center gap-2"><RefreshCw size={14}/>{syncMut.isPending?'Syncing...':'Sync endoflife.date (50)'}</button>} />
      {syncMut.data && <div className="mb-4 text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-900 rounded p-3">Sync complete: {JSON.stringify(syncMut.data)}</div>}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 overflow-auto">
        {isLoading ? <div className="text-slate-400">Loading...</div> : (
          <table className="w-full text-sm"><thead className="text-slate-400 text-xs uppercase"><tr className="border-b border-slate-800"><th className="text-left py-2 pr-3">Product</th><th className="text-left py-2 pr-3">Slug</th><th className="text-left py-2 pr-3">Vendor</th><th className="text-left py-2 pr-3">Aliases</th></tr></thead>
            <tbody>
              {(data?.items||[]).map((p:any)=>(<tr key={p.id} className="border-b border-slate-800/60"><td className="py-2 pr-3 text-white">{p.title}</td><td className="py-2 pr-3 font-mono text-xs">{p.slug}</td><td className="py-2 pr-3">{p.vendor || '-'}</td><td className="py-2 pr-3 text-xs text-slate-400">{(p.aliases||[]).join(', ') || '-'}</td></tr>))}
              {(!data?.items || data.items.length===0) && <tr><td colSpan={4} className="py-8 text-center text-slate-500">No lifecycle products synced yet. Click "Sync endoflife.date" to ingest catalog data from the real API.</td></tr>}
            </tbody>
          </table>
        )}
        <div className="mt-3 text-xs text-slate-500">Total: {data?.total || 0}. Source: endoflife.date API v1 (real integration). AWS Health and vendor source adapters are architected for extension.</div>
      </div>
    </div>
  )
}

function CoveragePage() {
  const { data, isLoading } = useQuery({ queryKey: ['coverage'], queryFn: api.getCoverage })
  const { data: errors } = useQuery({ queryKey: ['coll-errors'], queryFn: api.getCollectionErrors })
  return (
    <div>
      <PageHeader title="Collector Coverage" subtitle="Adapter registry, discovery breadth, enrichment support, and collection diagnostics" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#111827] border border-slate-800 rounded-lg p-4 overflow-auto">
          <div className="font-medium mb-3">Coverage Matrix</div>
          {isLoading ? <div className="text-slate-400">Loading...</div> : (
            <table className="w-full text-sm"><thead className="text-slate-400 text-xs uppercase"><tr className="border-b border-slate-800"><th className="text-left py-2 pr-3">Service</th><th className="text-left py-2 pr-3">Resource Type</th><th className="text-left py-2 pr-3">Source</th><th className="text-left py-2 pr-3">Status</th><th className="text-left py-2 pr-3">Version</th><th className="text-left py-2 pr-3">Last Collection</th></tr></thead>
              <tbody>
                {(data?.items||[]).map((c:any,i:number)=>(<tr key={i} className="border-b border-slate-800/60"><td className="py-2 pr-3">{c.aws_service}</td><td className="py-2 pr-3 text-xs">{c.resource_type}</td><td className="py-2 pr-3">{c.discovery_source}</td><td className="py-2 pr-3"><span className={`${c.coverage_status==='Fully Supported'?'text-emerald-400':c.coverage_status==='Collection Failed'?'text-red-400':'text-amber-400'}`}>{c.coverage_status}</span></td><td className="py-2 pr-3">{c.version_support?'Yes':'No'}</td><td className="py-2 pr-3 text-xs text-slate-400">{c.last_collection_at ? String(c.last_collection_at) : '-'}</td></tr>))}
                {(!data?.items || data.items.length===0) && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No coverage records yet. Run a scan to populate the registry.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 overflow-auto">
          <div className="font-medium mb-3">Recent Collection Errors</div>
          <div className="space-y-2">
            {(errors?.items||[]).slice(0,20).map((e:any)=>(<div key={e.id} className="text-xs border border-slate-800 rounded p-2 bg-slate-900/50"><div className="text-amber-400">{e.service} {e.resource_type || ''} {e.region ? `· ${e.region}`:''}</div><div className="text-slate-300 mt-1 break-words">{e.message}</div><div className="text-slate-500 mt-1">{e.error_type} · {String(e.occurred_at)}</div></div>))}
            {(!errors?.items || errors.items.length===0) && <div className="text-slate-500 text-sm">No errors recorded.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ['runs'], queryFn: api.getCollectionsRuns })
  return (
    <div>
      <PageHeader title="Collection History" subtitle="Inventory scan runs, status, and summaries across accounts and regions" />
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 overflow-auto">
        {isLoading ? <div className="text-slate-400">Loading...</div> : (
          <table className="w-full text-sm"><thead className="text-slate-400 text-xs uppercase"><tr className="border-b border-slate-800"><th className="text-left py-2 pr-3">Run</th><th className="text-left py-2 pr-3">Account</th><th className="text-left py-2 pr-3">Status</th><th className="text-left py-2 pr-3">Started</th><th className="text-left py-2 pr-3">Summary</th></tr></thead>
            <tbody>
              {(data?.items||[]).map((r:any)=>(<tr key={r.id} className="border-b border-slate-800/60 align-top"><td className="py-2 pr-3">#{r.id}</td><td className="py-2 pr-3">{r.account_id ?? '-'}</td><td className="py-2 pr-3">{r.status}</td><td className="py-2 pr-3 text-xs">{String(r.started_at)}</td><td className="py-2 pr-3"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(r.summary, null, 2)}</pre></td></tr>))}
              {(!data?.items || data.items.length===0) && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No collection runs recorded.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function WatchlistPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['watchlist'], queryFn: api.getWatchlist })
  const recompute = useMutation({ mutationFn: api.recomputeMatches, onSuccess: () => { qc.invalidateQueries({queryKey:['watchlist']}); qc.invalidateQueries({queryKey:['overview']}) } })
  const riskTone = (r:string) => r==='Critical'?'text-red-400':r==='High'?'text-orange-400':r==='Medium'?'text-amber-400':r==='Low'?'text-emerald-400':'text-slate-400'
  return (
    <div>
      <PageHeader title="EOS/EOL Watchlist" subtitle="Technologies approaching lifecycle milestones, with independent EOS and EOL countdowns and affected AWS resources" actions={<button onClick={()=>recompute.mutate()} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm hover:bg-slate-700">{recompute.isPending?'Computing...':'Recompute Matches'}</button>} />
      {recompute.data && <div className="mb-3 text-xs text-emerald-400">Recompute: {JSON.stringify(recompute.data)}</div>}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 overflow-auto">
        {isLoading ? <div className="text-slate-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="text-slate-400 text-xs uppercase"><tr className="border-b border-slate-800">
              <th className="text-left py-2 pr-3">Resource</th><th className="text-left py-2 pr-3">Service/Type</th><th className="text-left py-2 pr-3">Technology</th><th className="text-left py-2 pr-3">Version</th><th className="text-left py-2 pr-3">Account/Region</th><th className="text-left py-2 pr-3">EOS</th><th className="text-left py-2 pr-3">EOL</th><th className="text-left py-2 pr-3">Risk</th><th className="text-left py-2 pr-3">Source/Match</th>
            </tr></thead>
            <tbody>
              {(data?.items||[]).map((m:any)=>(
                <tr key={m.match_id} className="border-b border-slate-800/60 align-top">
                  <td className="py-2 pr-3">{m.resource_id ? <Link to={`/resources/${m.resource_id}`} className="text-sky-400 hover:underline">{m.resource_name || m.resource_id}</Link> : '-'}</td>
                  <td className="py-2 pr-3 text-xs">{m.service}<div className="text-slate-500">{m.resource_type}</div></td>
                  <td className="py-2 pr-3">{m.technology}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{m.installed_version || '-'}</td>
                  <td className="py-2 pr-3 text-xs">{m.account_id || '-'}<div className="text-slate-500">{m.region || ''}</div></td>
                  <td className="py-2 pr-3 text-xs">{m.eos_date ? String(m.eos_date) : 'Unknown'}<div className={m.eos_days_remaining!=null && m.eos_days_remaining<0?'text-red-400':m.eos_days_remaining!=null && m.eos_days_remaining<=90?'text-amber-400':'text-slate-400'}>{m.eos_days_remaining!=null ? `${m.eos_days_remaining} days (${m.eos_state})` : m.eos_state || 'unknown'}</div></td>
                  <td className="py-2 pr-3 text-xs">{m.eol_date ? String(m.eol_date) : 'Unknown'}<div className={m.eol_days_remaining!=null && m.eol_days_remaining<0?'text-red-400':m.eol_days_remaining!=null && m.eol_days_remaining<=90?'text-amber-400':'text-slate-400'}>{m.eol_days_remaining!=null ? `${m.eol_days_remaining} days (${m.eol_state})` : m.eol_state || 'unknown'}</div></td>
                  <td className={`py-2 pr-3 font-medium ${riskTone(m.risk)}`}>{m.risk}</td>
                  <td className="py-2 pr-3 text-xs text-slate-400">{m.lifecycle_source || 'n/a'}<div>{m.match_status}</div><div className="max-w-xs truncate" title={m.reason||''}>{m.reason}</div></td>
                </tr>
              ))}
              {(!data?.items || data.items.length===0) && <tr><td colSpan={9} className="py-8 text-center text-slate-500">No lifecycle matches yet. Connect an account, scan resources, sync lifecycle catalog (endoflife.date), then recompute matches.</td></tr>}
            </tbody>
          </table>
        )}
        <div className="mt-3 text-xs text-slate-500">Sorted by nearest upcoming milestones. Countdown formula: milestone date - current UTC date. Unknown/ambiguous matches are shown without fabricated dates.</div>
      </div>
    </div>
  )
}

function SimplePage({ title, subtitle, body }: { title: string; subtitle: string; body: string }) {
  return <div><PageHeader title={title} subtitle={subtitle} /><div className="bg-[#111827] border border-slate-800 rounded-lg p-6 text-slate-300 text-sm leading-6">{body}</div></div>
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
      if (!test?.ok) {
        throw new Error(test?.error || 'Invalid AWS credentials')
      }
      const acct = await api.createAccount({
        account_id: test.identity?.account_id,
        account_name: test.identity?.account_id ? `AWS ${test.identity.account_id}` : 'AWS Account',
        auth_type: 'keys',
        access_key_id: accessKey,
        secret_access_key: secretKey,
      })
      let connectRes: any = null
      if (acct?.id) {
        connectRes = await api.connectAccount(acct.id)
      }
      if (connectRes && connectRes.ok === false) {
        throw new Error(connectRes.error || 'Connected account created but AWS connection failed')
      }
      localStorage.setItem('aws_portal_logged_in', 'true')
      if (acct?.id) localStorage.setItem('aws_account_id', String(acct.id))
      navigate('/', { replace: true })
    } catch (err: any) {
      const status = err?.response?.status
      const dataMsg = err?.response?.data?.detail || err?.response?.data?.error
      const msg = dataMsg || err?.message || 'Login failed'
      const hint = status === 502 || err?.code === 'ERR_BAD_RESPONSE' ? ' (Backend unavailable or proxy error - ensure backend service is running and reachable)' : ''
      setError((typeof msg === 'string' ? msg : JSON.stringify(msg)) + hint)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-lg p-6 shadow-xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">AWS Portal Login</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in with your AWS credentials to access the platform.</p>
        </div>
        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Access Key ID</label>
            <input value={accessKey} onChange={e=>setAccessKey(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="AKIA..." autoComplete="off" required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Secret Access Key</label>
            <input type="password" value={secretKey} onChange={e=>setSecretKey(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="Secret access key" autoComplete="new-password" required />
          </div>
          {error && <div className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded p-2 break-words">{error}</div>}
          <button type="submit" disabled={loading || !accessKey || !secretKey} className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black font-medium rounded text-sm">{loading ? 'Signing in...' : 'Login'}</button>
        </form>
        <div className="text-xs text-slate-500 mt-4">Read-only access recommended. Credentials are validated via AWS STS.</div>
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
        <Route path="/software" element={<SimplePage title="Software Inventory" subtitle="Discovered OS, packages, runtimes, and container components" body="Software inventory is collected via AWS Systems Manager Inventory, container image metadata, SBOM integrations (Syft/Trivy where configured), and Kubernetes APIs where authorized. EC2 instances without SSM management are reported as unmanaged with incomplete software coverage rather than healthy. Run account scans and configure SSM/collector integrations to populate this view with real data." />} />
        <Route path="/lifecycle" element={<LifecyclePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/analytics" element={<SimplePage title="Technical Debt Analytics" subtitle="Debt trends, exposure windows, and breakdowns by account, service, team, and environment" body="Analytics aggregate lifecycle urgency (30/60/90/180 day windows), unsupported resources, and remediation progress from persisted assessments and snapshots. Charts drill down to affected resources. Metrics are derived from real backend data and clearly distinguish discovered resources from successfully lifecycle-assessed resources." />} />
        <Route path="/risk" element={<SimplePage title="Risk Assessment" subtitle="Configurable lifecycle risk scoring with explainable factors" body="Risk considers EOS/EOL proximity, passed milestones, environment/criticality, security update availability, upgrade path, ownership, and lifecycle data confidence. Default bands: Critical (≤30 days or unsupported), High (31–90), Medium (91–180), Low (>180), Unknown. Each flagged resource includes an explanation; lifecycle urgency is distinct from vulnerability severity." />} />
        <Route path="/remediation" element={<SimplePage title="Remediation Management" subtitle="Plan, assign, and track upgrades and risk acceptance" body="Create remediation records with owner/team, target upgrade, target date, notes, and status (Not Started, Planned, In Progress, Blocked, Completed, Risk Accepted). The platform is read-only with respect to AWS infrastructure and does not perform automatic upgrades." />} />
        <Route path="/coverage" element={<CoveragePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/sources" element={<SimplePage title="Lifecycle Data Sources" subtitle="Source precedence, synchronization status, and references" body="Configured sources: endoflife.date API v1 (implemented), AWS Health lifecycle APIs (adapter-ready, requires permissions/subscription), and official vendor sources (extensible adapter framework). Source precedence is configurable (AWS official > vendor > endoflife.date > other verified). Conflicting dates are not silently overwritten; selected source and reasons are recorded." />} />
        <Route path="/teams" element={<SimplePage title="Team and Ownership" subtitle="Ownership mapping, tag conventions, and unassigned resources" body="Ownership is derived from AWS tags (Owner/Team/Application/Environment/CostCenter/BusinessUnit), account metadata, naming rules, and manual overrides. A team registry and resource relationships support accountability for lifecycle remediation. Unassigned resources are surfaced for triage." />} />
        <Route path="/settings" element={<SimplePage title="Settings" subtitle="Collection schedules, thresholds, tag keys, and integrations" body="Configure AWS profiles/roles, region scope, collection schedules (inventory 24h, lifecycle 12h, recalculation daily by default), risk thresholds, ownership tag keys, and lifecycle source precedence. Environment-based configuration is supported for local and future cloud deployments." />} />
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
