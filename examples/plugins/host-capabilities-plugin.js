/**
 * Host Capabilities Plugin Example
 * 
 * Demonstrates how to extend the host context with custom capabilities
 * like database connections, API clients, and resource management
 * 
 * To use this plugin, add it to your genaiscript.config.json:
 * {
 *   "plugins": ["./examples/plugins/host-capabilities-plugin.js"]
 * }
 */

export default {
    name: "host-capabilities-plugin",

    setup(extend, options) {
        const trace = options?.trace
        const cancellationToken = options?.cancellationToken

        extend((context) => {
            if (!context.host) context.host = {}
                /**
                 * Create a mock database connection
                 * @param connectionString - Database connection string
                 * @returns Database client interface
                 */
            context.host.database = async function(connectionString) {
                    trace?.log(`Connecting to database: ${connectionString}`)

                    // Mock database client
                    return {
                        /**
                         * Execute a query
                         * @param sql - SQL query string
                         * @param params - Query parameters
                         * @returns Query results
                         */
                        async query(sql, params = []) {
                            trace?.log(`Executing query: ${sql}`)
                            
                            // Check for cancellation
                            if (cancellationToken?.aborted) {
                                throw new Error("Query cancelled")
                            }

                            // Mock query execution
                            // In a real implementation, this would execute against a real database
                            return {
                                rows: [
                                    { id: 1, name: "Example User", email: "user@example.com" },
                                    { id: 2, name: "Another User", email: "another@example.com" },
                                ],
                                rowCount: 2,
                                command: "SELECT",
                            }
                        },

                        /**
                         * Execute a transaction
                         * @param callback - Transaction callback
                         * @returns Transaction result
                         */
                        async transaction(callback) {
                            trace?.log("Starting transaction")
                            try {
                                const result = await callback(this)
                                trace?.log("Transaction committed")
                                return result
                            } catch (error) {
                                trace?.error(`Transaction rolled back: ${error.message}`)
                                throw error
                            }
                        },

                        /**
                         * Close database connection
                         */
                        async close() {
                            trace?.log("Closing database connection")
                        },
                    }
                },

                /**
                 * Create an API client with common HTTP methods
                 * @param baseUrl - Base URL for the API
                 * @param options - Client options
                 * @returns API client interface
                 */
            context.host.apiClient = function(baseUrl, options = {}) {
                    const { headers = {}, timeout = 30000 } = options
                    trace?.log(`Creating API client for: ${baseUrl}`)

                    return {
                        /**
                         * Make a GET request
                         * @param path - API path
                         * @param queryParams - Query parameters
                         * @returns Response data
                         */
                        async get(path, queryParams = {}) {
                            const url = new URL(path, baseUrl)
                            Object.entries(queryParams).forEach(([key, value]) => {
                                url.searchParams.append(key, value)
                            })

                            trace?.log(`GET ${url.toString()}`)

                            // Mock response
                            return {
                                status: 200,
                                data: { message: "Mock GET response", path, queryParams },
                            }
                        },

                        /**
                         * Make a POST request
                         * @param path - API path
                         * @param body - Request body
                         * @returns Response data
                         */
                        async post(path, body) {
                            const url = new URL(path, baseUrl)
                            trace?.log(`POST ${url.toString()}`)

                            // Mock response
                            return {
                                status: 201,
                                data: { message: "Mock POST response", path, body },
                            }
                        },

                        /**
                         * Make a PUT request
                         * @param path - API path
                         * @param body - Request body
                         * @returns Response data
                         */
                        async put(path, body) {
                            const url = new URL(path, baseUrl)
                            trace?.log(`PUT ${url.toString()}`)

                            // Mock response
                            return {
                                status: 200,
                                data: { message: "Mock PUT response", path, body },
                            }
                        },

                        /**
                         * Make a DELETE request
                         * @param path - API path
                         * @returns Response data
                         */
                        async delete(path) {
                            const url = new URL(path, baseUrl)
                            trace?.log(`DELETE ${url.toString()}`)

                            // Mock response
                            return {
                                status: 204,
                                data: { message: "Mock DELETE response", path },
                            }
                        },
                    }
                },

                /**
                 * Manage a pool of resources with lifecycle management
                 * @param resourceFactory - Factory function to create resources
                 * @param options - Pool options
                 * @returns Resource pool manager
                 */
            context.host.resourcePool = function(resourceFactory, options = {}) {
                    const { maxSize = 10, minSize = 2 } = options
                    const pool = []
                    const inUse = new Set()

                    trace?.log(`Creating resource pool (min: ${minSize}, max: ${maxSize})`)

                    return {
                        /**
                         * Acquire a resource from the pool
                         * @returns Resource instance
                         */
                        async acquire() {
                            // Find available resource
                            let resource = pool.find((r) => !inUse.has(r))

                            // Create new resource if needed and pool not full
                            if (!resource && pool.length < maxSize) {
                                resource = await resourceFactory()
                                pool.push(resource)
                                trace?.log(`Created new resource (pool size: ${pool.length})`)
                            }

                            if (!resource) {
                                throw new Error("No resources available")
                            }

                            inUse.add(resource)
                            trace?.log(`Resource acquired (in use: ${inUse.size})`)
                            return resource
                        },

                        /**
                         * Release a resource back to the pool
                         * @param resource - Resource to release
                         */
                        async release(resource) {
                            inUse.delete(resource)
                            trace?.log(`Resource released (in use: ${inUse.size})`)
                        },

                        /**
                         * Drain and close all resources in the pool
                         */
                        async drain() {
                            trace?.log("Draining resource pool")
                            for (const resource of pool) {
                                if (resource.close) {
                                    await resource.close()
                                }
                            }
                            pool.length = 0
                            inUse.clear()
                            trace?.log("Resource pool drained")
                        },

                        /**
                         * Get pool statistics
                         */
                        stats() {
                            return {
                                total: pool.length,
                                available: pool.length - inUse.size,
                                inUse: inUse.size,
                                maxSize,
                                minSize,
                            }
                        },
                    }
                },

                /**
                 * Create a simple event emitter for custom events
                 * @returns Event emitter interface
                 */
            context.host.eventEmitter = function() {
                    const listeners = new Map()

                    return {
                        /**
                         * Register an event listener
                         * @param event - Event name
                         * @param callback - Event callback
                         */
                        on(event, callback) {
                            if (!listeners.has(event)) {
                                listeners.set(event, [])
                            }
                            listeners.get(event).push(callback)
                        },

                        /**
                         * Emit an event
                         * @param event - Event name
                         * @param data - Event data
                         */
                        emit(event, data) {
                            const eventListeners = listeners.get(event)
                            if (eventListeners) {
                                trace?.log(`Emitting event: ${event}`)
                                eventListeners.forEach((callback) => callback(data))
                            }
                        },

                        /**
                         * Remove an event listener
                         * @param event - Event name
                         * @param callback - Event callback to remove
                         */
                        off(event, callback) {
                            const eventListeners = listeners.get(event)
                            if (eventListeners) {
                                const index = eventListeners.indexOf(callback)
                                if (index > -1) {
                                    eventListeners.splice(index, 1)
                                }
                            }
                        },
                    }
                }

            trace?.log?.("Host Capabilities Plugin loaded successfully")
        })
    }
}
