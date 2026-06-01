/**
 * Neon HTTP SQL API utilities — Edge Runtime compatible.
 *
 * Uses raw fetch() to the Neon /sql endpoint. Zero dependencies:
 * no Prisma, no pg, no native bindings. Works in Vercel Edge Runtime,
 * Node.js serverless functions, and browsers.
 */

/**
 * Execute a single SQL statement via the Neon HTTP API.
 * Returns { ok, msg } — suitable for DDL / mutations.
 */
export async function neonRawQuery(
  connectionString: string,
  sql: string
): Promise<{ ok: boolean; msg: string }> {
  try {
    const asHttp = connectionString
      .replace(/^postgresql:\/\//, 'http://')
      .replace(/^postgres:\/\//, 'http://')
    const host = new URL(asHttp).hostname

    const response = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': connectionString,
      },
      body: JSON.stringify({ query: sql }),
    })

    const text = await response.text()
    let data: Record<string, unknown>

    try {
      data = JSON.parse(text)
    } catch {
      return { ok: response.ok, msg: `HTTP ${response.status}: ${text.substring(0, 100)}` }
    }

    const errorMsg = (data.error || data.message || data.detail || '') as string
    if (typeof errorMsg === 'string' && errorMsg.length > 0 && !response.ok) {
      return { ok: false, msg: errorMsg.substring(0, 150) }
    }

    return { ok: true, msg: 'OK' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, msg: msg.substring(0, 150) }
  }
}

/**
 * Execute a SELECT query via the Neon HTTP API.
 * Returns parsed rows as an array. Returns [] on any error.
 * Edge Runtime compatible — uses only fetch + JSON.parse.
 */
export async function neonQueryRows<T = Record<string, unknown>>(
  connectionString: string,
  sql: string
): Promise<T[]> {
  try {
    const asHttp = connectionString
      .replace(/^postgresql:\/\//, 'http://')
      .replace(/^postgres:\/\//, 'http://')
    const host = new URL(asHttp).hostname

    const response = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': connectionString,
      },
      body: JSON.stringify({ query: sql }),
    })

    if (!response.ok) return []

    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return Array.isArray(data.rows) ? data.rows : []
    } catch {
      return []
    }
  } catch {
    return []
  }
}
