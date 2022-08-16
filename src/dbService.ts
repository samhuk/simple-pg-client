import { randomUUID } from 'crypto'
import { QueryResult } from 'pg'
import { truncate } from './common/string'
import { DbService, DbServiceOptions } from './types'

const onQuery = (options: DbServiceOptions, queryId: string, sql: string, parameters?: string[]) => {
  options.events?.onQuery?.(queryId, `Executing SQL (${queryId}): ${truncate(sql, options.sqlLoggingTruncation)}`, sql, parameters)
}

const onError = (options: DbServiceOptions, queryId: string, error: any, sql: string, parameters?: string[]) => {
  options.events?.onError?.(queryId, `Executing SQL Failed (${queryId}): ${error.message}`, sql, parameters)
}

const queryBase = async <T = any>(
  options: DbServiceOptions,
  sql: string,
  parameters: any,
  resultCreator: (result: QueryResult) => T,
) => {
  const queryId = randomUUID()
  onQuery(options, queryId, sql, parameters)
  try {
    const result = await options.client.query(sql, parameters)
    return resultCreator(result)
  }
  catch (e) {
    onError(options, queryId, e, sql, parameters)
    throw e
  }
}

export const createDbService = (options: DbServiceOptions): DbService => ({
  query: async (sql, parameters) => queryBase(options, sql, parameters, r => r),
  queryExists: async (sql, parameters) => queryBase(options, sql, parameters, r => r.rows.length > 0),
  queryGetFirstRow: async (sql, parameters) => queryBase(options, sql, parameters, r => r.rows[0]),
  queryGetRows: async (sql, parameters) => queryBase(options, sql, parameters, r => r.rows),
})
