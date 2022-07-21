/* eslint-disable no-console */
import { createSimplePgClient } from '.'
import { SimplePgClientOptions } from './types'

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

  test('basic test of initial values', async () => {
    const options: SimplePgClientOptions = {
      ...DEFAULT_OPTIONS,
      events: {
        onTryMaintenanceDbConnect: (c, i, m) => console.log(m),
        onMaintenanceDbConnect: (c, i, m) => console.log(m),
        onMaintenanceDbConnectFail: (c, i, e, m) => console.log(m),
        onMaintenanceDbConnectNumRetryExceeded: (c, i, m) => console.log(m),

        onDetermineIfDbExistsStart: (c, m) => console.log(m),
        onDetermineDbExists: (c, m) => console.log(m),
        onDetermineDbDoesNotExists: (c, m) => console.log(m),

        onTryCreateDb: (c, m) => console.log(m),
        onCreateDb: (c, m) => console.log(m),
        onCreateDbFail: (c, e, m) => console.log(m),

        onTryDbConnect: (c, m) => console.log(m),
        onDbConnect: (c, m) => console.log(m),
        onDbConnectFail: (c, i, e, m) => console.log(m),
        onDbConnectNumRetryExceeded: (c, i, e, m) => console.log(m),
      },
    }
    const simplePgClient = await fn(options)

    expect(simplePgClient).toBeDefined()

    await simplePgClient.client.end()
  })
})
