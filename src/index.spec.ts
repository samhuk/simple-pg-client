/* eslint-disable no-console */
import { createConsoleLogEventHandlers, createSimplePgClient } from '.'
import { SimplePgClient, SimplePgClientOptions } from './types'

const DEFAULT_OPTIONS: SimplePgClientOptions = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  db: 'my-app-store',
  extensions: ['uuid-ossp'],
  retryIntervalExpression: retryIndex => (retryIndex + 1) * 2,
  createDbIfNotExists: true,
  maxNumRetry: 2,
  schemaName: 'public',
  sqlLoggingTruncation: 200,
  createDbSqlTemplate: `CREATE DATABASE {db}
WITH
OWNER = postgres
ENCODING = 'UTF8'
TABLESPACE = pg_default
CONNECTION LIMIT = -1;`,
  maintenanceDbOptions: {
    db: 'postgres',
    maxNumRetry: 10,
    user: 'postgres',
    password: 'postgres',
  },
  additionalPgOptions: {
    query_timeout: 5000,
  },
}

describe('createSimplePgClient', () => {
  const fn = createSimplePgClient

  let simplePgClient: SimplePgClient

  afterEach(async () => {
    await simplePgClient.client.end()
  })

  test('basic test of initial values', async () => {
    const options: SimplePgClientOptions = {
      ...DEFAULT_OPTIONS,
      events: createConsoleLogEventHandlers(),
    }
    simplePgClient = await fn(options)
  })

  test('error handling', async () => {
    let onErrorParams: any[]
    let e: any
    let result: any

    const options: SimplePgClientOptions = {
      ...DEFAULT_OPTIONS,
      events: {
        ...createConsoleLogEventHandlers(),
        onQueryError: (...params) => {
          onErrorParams = params
        },
      },
    }
    simplePgClient = await fn(options)

    try {
      result = await simplePgClient.query('not a valid query')
    }
    catch (_e) {
      e = _e
    }

    expect(e).toBeDefined()
    expect(result).toBeUndefined()
    const queryId = onErrorParams[0]
    expect(onErrorParams[1]).toBe(`Executing SQL Failed (${queryId}): syntax error at or near "not"`)
    expect(onErrorParams[2]).toBe('not a valid query')
    expect(onErrorParams[3]).toBe(undefined)
  })
})
