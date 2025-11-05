/**
 * Custom Parser Plugin Example
 * 
 * Demonstrates how to add a custom file parser for Protocol Buffers (.proto files)
 * and GraphQL schema files (.graphql)
 * 
 * To use this plugin, add it to your genaiscript.config.json:
 * {
 *   "plugins": ["./examples/plugins/custom-parser-plugin.js"]
 * }
 */

export default {
    name: "custom-parser-plugin",

    setup(extend, hooks, options) {
        const trace = options?.trace

        extend((context) => {
            if (!context.parsers) context.parsers = {}
            /**
             * Parse Protocol Buffer (.proto) files
             * @param content - The .proto file content or path
             * @returns Parsed proto structure
             */
            context.parsers.PROTO = async function(content) {
                    try {
                        // Get file content if path is provided
                        let protoContent = content
                        if (typeof content === "object" && content.content) {
                            protoContent = content.content
                        } else if (typeof content === "string" && content.endsWith(".proto")) {
                            // Would read file in real implementation
                            trace?.log(`Reading .proto file: ${content}`)
                        }

                        // Simple parser for demo - just extract messages and services
                        const messages = []
                        const services = []
                        const enums = []

                        const lines = protoContent.split("\n")
                        let currentBlock = null
                        let blockContent = []

                        for (const line of lines) {
                            const trimmed = line.trim()

                            // Detect message definitions
                            if (trimmed.startsWith("message ")) {
                                if (currentBlock) {
                                    // Save previous block
                                    if (currentBlock.type === "message") {
                                        messages.push({
                                            name: currentBlock.name,
                                            fields: blockContent,
                                        })
                                    }
                                }
                                const name = trimmed.match(/message\s+(\w+)/)?.[1]
                                currentBlock = { type: "message", name }
                                blockContent = []
                            }
                            // Detect service definitions
                            else if (trimmed.startsWith("service ")) {
                                if (currentBlock) {
                                    if (currentBlock.type === "service") {
                                        services.push({
                                            name: currentBlock.name,
                                            methods: blockContent,
                                        })
                                    }
                                }
                                const name = trimmed.match(/service\s+(\w+)/)?.[1]
                                currentBlock = { type: "service", name }
                                blockContent = []
                            }
                            // Detect enum definitions
                            else if (trimmed.startsWith("enum ")) {
                                if (currentBlock) {
                                    if (currentBlock.type === "enum") {
                                        enums.push({
                                            name: currentBlock.name,
                                            values: blockContent,
                                        })
                                    }
                                }
                                const name = trimmed.match(/enum\s+(\w+)/)?.[1]
                                currentBlock = { type: "enum", name }
                                blockContent = []
                            }
                            // Detect closing brace
                            else if (trimmed === "}") {
                                if (currentBlock) {
                                    if (currentBlock.type === "message") {
                                        messages.push({
                                            name: currentBlock.name,
                                            fields: blockContent,
                                        })
                                    } else if (currentBlock.type === "service") {
                                        services.push({
                                            name: currentBlock.name,
                                            methods: blockContent,
                                        })
                                    } else if (currentBlock.type === "enum") {
                                        enums.push({
                                            name: currentBlock.name,
                                            values: blockContent,
                                        })
                                    }
                                    currentBlock = null
                                    blockContent = []
                                }
                            }
                            // Collect content within blocks
                            else if (currentBlock && trimmed && !trimmed.startsWith("//")) {
                                blockContent.push(trimmed)
                            }
                        }

                        trace?.log(`Parsed .proto file: ${messages.length} messages, ${services.length} services, ${enums.length} enums`)

                        return {
                            messages,
                            services,
                            enums,
                        }
                    } catch (error) {
                        trace?.error?.(`Failed to parse .proto file: ${error.message}`)
                        return undefined
                    }
                }

            /**
             * Parse GraphQL schema files
             * @param content - The .graphql file content or path
             * @returns Parsed GraphQL schema structure
             */
            context.parsers.GRAPHQL = async function(content) {
                    try {
                        let schemaContent = content
                        if (typeof content === "object" && content.content) {
                            schemaContent = content.content
                        } else if (typeof content === "string" && content.endsWith(".graphql")) {
                            trace?.log(`Reading .graphql file: ${content}`)
                        }

                        // Simple parser for demo - extract types, queries, mutations
                        const types = []
                        const queries = []
                        const mutations = []

                        const lines = schemaContent.split("\n")
                        let currentType = null
                        let fields = []

                        for (const line of lines) {
                            const trimmed = line.trim()

                            // Detect type definitions
                            if (trimmed.startsWith("type ")) {
                                if (currentType) {
                                    if (currentType.name === "Query") {
                                        queries.push(...fields)
                                    } else if (currentType.name === "Mutation") {
                                        mutations.push(...fields)
                                    } else {
                                        types.push({
                                            name: currentType.name,
                                            fields,
                                        })
                                    }
                                }
                                const name = trimmed.match(/type\s+(\w+)/)?.[1]
                                currentType = { name }
                                fields = []
                            }
                            // Detect closing brace
                            else if (trimmed === "}") {
                                if (currentType) {
                                    if (currentType.name === "Query") {
                                        queries.push(...fields)
                                    } else if (currentType.name === "Mutation") {
                                        mutations.push(...fields)
                                    } else {
                                        types.push({
                                            name: currentType.name,
                                            fields,
                                        })
                                    }
                                    currentType = null
                                    fields = []
                                }
                            }
                            // Collect fields
                            else if (currentType && trimmed && !trimmed.startsWith("#")) {
                                const match = trimmed.match(/(\w+)\s*(?:\([^)]*\))?\s*:\s*(.+)/)
                                if (match) {
                                    fields.push({
                                        name: match[1],
                                        type: match[2],
                                    })
                                }
                            }
                        }

                        trace?.log(`Parsed .graphql file: ${types.length} types, ${queries.length} queries, ${mutations.length} mutations`)

                        return {
                            types,
                            queries,
                            mutations,
                        }
                    } catch (error) {
                        trace?.error?.(`Failed to parse .graphql file: ${error.message}`)
                        return undefined
                    }
                }

            trace?.log?.("Custom Parser Plugin loaded successfully")
        })
    }
}
