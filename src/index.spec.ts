/* eslint-disable no-console */
import { createSimplePg } from '.'
import { SimplePgOptions } from './types'

const DEFAULT_OPTIONS: SimplePgOptions = {
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

describe('createSimplePg', () => {
  const fn = createSimplePg

  test('basic test of initial values', async () => {
    const options: SimplePgOptions = {
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
    const simplePg = await fn(options)

    expect(simplePg).toBeDefined()

    await simplePg.client.end()
  })
})
