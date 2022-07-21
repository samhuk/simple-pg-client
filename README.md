# simple-pg

Wrapper around [pg](https://www.npmjs.com/package/pg) that provides connection retrying logic and a simpler cut-down query interface, with optional access to the underlying `pg` interface.

## Usage

```typescript
import { createSimplePg } from 'simple-pg'
const simplePg = createSimplePg({
  host: 'localhost',
  port: '5432',
  username: 'postgres',
  password: 'postgres',
  db: 'my-app-store-prod',
})
```

## Development

`npm i`

`npm start` - Start a hot-reloading tsc build.

`npm check` - Run linting, unit tests, and a tsc build.

## Notable Technologies

* typescript
* jest
* eslint
