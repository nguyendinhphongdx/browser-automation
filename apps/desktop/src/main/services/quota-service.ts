import { getDatabase } from '../database/init'

export interface QuotaConfig {
  maxRunsPerProfile: number
  perPeriod: 'hour' | 'day' | 'week'
  cooldownMinutes: number
}

/**
 * Check if a profile is allowed to run based on quota.
 * Uses workflow_logs as the source of truth.
 */
export function checkQuota(profileId: string, config: QuotaConfig): { allowed: boolean; reason?: string } {
  const db = getDatabase()

  // Check cooldown
  if (config.cooldownMinutes > 0) {
    const cutoff = new Date(Date.now() - config.cooldownMinutes * 60000).toISOString()
    const recent = db.prepare(
      "SELECT COUNT(*) as cnt FROM workflow_logs WHERE profile_id = ? AND started_at > ?"
    ).get(profileId, cutoff) as any
    if (recent.cnt > 0) {
      return { allowed: false, reason: `Cooldown: profile ran within last ${config.cooldownMinutes} minutes` }
    }
  }

  // Check rate limit
  if (config.maxRunsPerProfile > 0) {
    const periodMs = config.perPeriod === 'hour' ? 3600000
      : config.perPeriod === 'week' ? 604800000
      : 86400000
    const cutoff = new Date(Date.now() - periodMs).toISOString()
    const count = db.prepare(
      "SELECT COUNT(*) as cnt FROM workflow_logs WHERE profile_id = ? AND started_at > ?"
    ).get(profileId, cutoff) as any
    if (count.cnt >= config.maxRunsPerProfile) {
      return { allowed: false, reason: `Quota exceeded: ${count.cnt}/${config.maxRunsPerProfile} per ${config.perPeriod}` }
    }
  }

  return { allowed: true }
}

/**
 * Select profiles based on filter rules.
 */
export function filterProfiles(
  profiles: { id: string; tags: string[]; proxyId: string | null; lastUsed: string | null }[],
  rules: ProfileSelectionRule[]
): typeof profiles {
  let result = [...profiles]

  for (const rule of rules) {
    switch (rule.type) {
      case 'tags': {
        const requiredTags = String(rule.value).split(',').map(s => s.trim().toLowerCase())
        result = result.filter(p =>
          requiredTags.some(t => p.tags.map(tag => tag.toLowerCase()).includes(t))
        )
        break
      }
      case 'last-used-before': {
        const cutoff = new Date(Date.now() - Number(rule.value) * 86400000).toISOString()
        result = result.filter(p => !p.lastUsed || p.lastUsed < cutoff)
        break
      }
      case 'random-sample': {
        const count = Number(rule.value) || result.length
        result = shuffleArray(result).slice(0, count)
        break
      }
    }
  }

  return result
}

export interface ProfileSelectionRule {
  type: 'tags' | 'last-used-before' | 'random-sample'
  value: string | number
}

export interface ABTestVariant {
  id: string
  name: string
  workflowId: string
  weight: number // 0–100
}

/**
 * Pick a workflow variant based on weights.
 */
export function pickABVariant(variants: ABTestVariant[]): ABTestVariant {
  const totalWeight = variants.reduce((s, v) => s + v.weight, 0)
  let rand = Math.random() * totalWeight
  for (const variant of variants) {
    rand -= variant.weight
    if (rand <= 0) return variant
  }
  return variants[variants.length - 1]
}

/**
 * Topological sort for workflow dependency graph.
 * Returns ordered workflow IDs, or throws if cycle detected.
 */
export function topologicalSort(
  workflowIds: string[],
  dependencies: WorkflowDependency[]
): string[] {
  const graph = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const id of workflowIds) {
    graph.set(id, [])
    inDegree.set(id, 0)
  }

  for (const dep of dependencies) {
    if (!graph.has(dep.workflowId)) continue
    for (const depId of dep.dependsOn) {
      if (!graph.has(depId)) continue
      graph.get(depId)!.push(dep.workflowId)
      inDegree.set(dep.workflowId, (inDegree.get(dep.workflowId) || 0) + 1)
    }
  }

  const queue = workflowIds.filter(id => (inDegree.get(id) || 0) === 0)
  const sorted: string[] = []

  while (queue.length > 0) {
    const id = queue.shift()!
    sorted.push(id)
    for (const next of graph.get(id) || []) {
      const deg = (inDegree.get(next) || 1) - 1
      inDegree.set(next, deg)
      if (deg === 0) queue.push(next)
    }
  }

  if (sorted.length !== workflowIds.length) {
    throw new Error('Dependency cycle detected — cannot determine execution order')
  }

  return sorted
}

export interface WorkflowDependency {
  workflowId: string
  dependsOn: string[]
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
