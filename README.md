# simple-pg-client

Wrapper around [pg](https://www.npmjs.com/package/pg) that provides connection retrying, automatic database creation, and a simpler cut-down query interface, with optional access to the underlying `pg` client.

## Usage

`npm i --save simple-pg-client`

Basic usage:

```typescript
import { createSimplePgClient } from 'simple-pg-client'

const provision = async () => {
  // Connect to DB
  const db = await createSimplePgClient({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    db: 'my-app-store-prod',
  })
  const db = await createProdAppStoreDbService()
  // Query and return the full default `pg` client query response
  await db.query('create table "user"')
  // Query and return first row
  const userRow = await db.queryGetFirstRow('insert into "user" (id, name) values (1, "user1")')
  // Query and return all rows
  const userRows = await db.queryGetRows('select * from "user"')
}
```

Full options:

```typescript
import { createSimplePgClient } from 'simple-pg-client'

export const createProdAppStoreDbService = () => createSimplePgClient({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  db: 'my-app-store-prod',
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
  events: {
    // ...
    onDbConnect: (client, message) => console.log(message),
    // ...
  }
})
```

See the Typescript JSDocs for descriptions of the options.

## Development

`npm i`

`npm start` - Start a hot-reloading tsc build.

`npm run check` - Run linting, unit tests, and a tsc build.

## Notable Technologies

* typescript
* jest
* eslint
