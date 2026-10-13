export type Finding = { code: string; title: string; evidence: string; severity: string }
export type Transaction = { id: string; timestamp: string; amount: number; merchant: string; category: string; city: string; state: string; risk_band: 'low'|'medium'|'high'; demo_risk: number; findings: Finding[] }
export type Overview = { total_transactions: number; high_risk_scenarios: number; lower_risk_scenarios: number; alert_rate: number; flagged_amount: number; rule_review_count: number; risk_distribution: Record<string,number>; mode: string; disclaimer: string }
export type Page<T> = { items: T[]; total: number; page: number; page_size: number }
export type Evidence = { id:string; source_type:string; transaction_id?:string; rule_id?:string; observed_value?:unknown; derived_value?:unknown; explanation:string; source_time?:string; status:string; limitations:string }
export type AgentFinding = { text:string; evidence_ids:string[]; kind:string }
export type Investigation = { case_id:string; mode:string; summary:string; findings:AgentFinding[]; missing_evidence:string[]; next_checks:string[]; evidence:Evidence[]; tool_calls:{name:string;status:string;evidence_ids?:string[]}[]; requires_analyst_confirmation:boolean; disclaimer:string }
export type Case = { id:string;transaction_id:string;status:string;created_at:string;updated_at:string }
export type AuditEvent = { id:string;case_id:string;transaction_id:string;action:string;rationale?:string;actor:string;at:string }
const base = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? 'https://verity-flow-ai-c8lt-onmf79a4o.vercel.app' : '')
async function request<T>(path: string): Promise<T> { const response = await fetch(`${base}${path}`); if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message ?? `Request failed (${response.status})`) }; return response.json() }
export const api = {
  health: () => request<{status:string;mode:string}>('/health'),
  overview: () => request<Overview>('/api/v1/overview'),
  transactions: (params: URLSearchParams) => request<Page<Transaction>>(`/api/v1/transactions?${params}`),
  transaction: (id: string) => request<Transaction>(`/api/v1/transactions/${encodeURIComponent(id)}`),
  trends: () => request<{items:{date:string;total:number;alerts:number}[]}>('/api/v1/analytics/fraud-trends'),
  categories: () => request<{items:{category:string;total:number;alerts:number;amount:number}[]}>('/api/v1/analytics/categories'),
  investigate: (id:string,question:string) => post<Investigation>(`/api/v1/transactions/${encodeURIComponent(id)}/investigate`,{question}),
  cases: () => request<{items:Case[];mode:string}>('/api/v1/cases'),
  caseDetail: (id:string) => request<{case:Case;evidence:Evidence[];events:AuditEvent[];transaction:Transaction|null}>(`/api/v1/cases/${encodeURIComponent(id)}`),
  action: (id:string,transaction_id:string,action:string,rationale:string,confirmed:boolean) => post<{event:AuditEvent;disclaimer:string}>(`/api/v1/cases/${encodeURIComponent(id)}/actions`,{transaction_id,action,rationale,confirmed}),
  compare: (id:string,withId:string) => request<{left:Transaction;right:Transaction;comparison:Record<string,unknown>;mode:string;limitations:string}>(`/api/v1/transactions/${encodeURIComponent(id)}/compare?with_id=${encodeURIComponent(withId)}`),
  report: (id:string) => post<Record<string,unknown>>(`/api/v1/cases/${encodeURIComponent(id)}/report`,{}),
}
async function post<T>(path:string,body:unknown):Promise<T>{const response=await fetch(`${base}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok){const payload=await response.json().catch(()=>({}));throw new Error(payload.message??`Request failed (${response.status})`)}return response.json()}
