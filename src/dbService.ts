import { randomUUID } from 'crypto'
import { truncate } from './common/string'
import { DbService, DbServiceOptions } from './types'

const onQuery = (options: DbServiceOptions, queryId: string, sql: string, parameters?: string[]) => {
  options.events?.onQuery?.(queryId, `Executing SQL (${queryId}): ${truncate(sql, options.sqlLoggingTruncation)}`, sql, parameters)
}

const onError = (options: DbServiceOptions, queryId: string, error: any, sql: string, parameters?: string[]) => {
  options.events?.onError?.(queryId, `Executing SQL Failed (${queryId}): ${error.message}`, sql, parameters)
}

export const createDbService = (options: DbServiceOptions): DbService => ({
  query: (sql, parameters) => {
    const queryId = randomUUID()
    onQuery(options, queryId, sql, parameters)
    return options.client.query(sql, parameters)
      .catch(error => {
        onError(options, queryId, error, sql, parameters)
        return null
      })
  },
  queryExists: (sql, parameters) => {
    const queryId = randomUUID()
    onQuery(options, queryId, sql, parameters)
    return options.client.query(sql, parameters)
      .then(result => result.rowCount > 0)
      .catch(error => {
        onError(options, queryId, error, sql, parameters)
        return null
      })
  },
  queryGetFirstRow: (sql, parameters) => {
    const queryId = randomUUID()
    onQuery(options, queryId, sql, parameters)
    return options.client.query(sql, parameters)
      .then(result => result.rows[0])
      .catch(error => {
        onError(options, queryId, error, sql, parameters)
        return null
      })
  },
  queryGetRows: (sql, parameters) => {
    const queryId = randomUUID()
    onQuery(options, queryId, sql, parameters)
    return options.client.query(sql, parameters)
      .then(result => result.rows)
      .catch(error => {
        onError(options, queryId, error, sql, parameters)
        return null
      })
  },
})
