/**
 * Demo Script: Using GenAIScript Plugins
 * 
 * This script demonstrates how to use the example plugins:
 * - Custom parsers for .proto and .graphql files
 * - Global utility functions
 * - Host capabilities (database, API client, etc.)
 */

// Note: In a real GenAIScript, these plugins would be registered
// in the configuration or at the start of script execution

script({
    title: "Plugin Demo Script",
    description: "Demonstrates plugin functionality",
})

// Example 1: Using Custom Parser Plugin for Protocol Buffers
$`## Parsing Protocol Buffer Files

Let's parse a .proto file to extract message and service definitions.
`

// This would work if the custom parser plugin is registered
// const protoContent = await workspace.readText("test-data/example.proto")
// const protoData = await parsers.PROTO(protoContent)
// 
// $`Found ${protoData.messages.length} messages and ${protoData.services.length} services:`
// 
// for (const message of protoData.messages) {
//     $`- Message: ${message.name} (${message.fields.length} fields)`
// }

$`(Simulated) Protocol Buffer parsing would extract messages like:
- User
- GetUserRequest
- CreateUserRequest
- UserListResponse

And services like:
- UserService
- AdminService
`

// Example 2: Using Custom Parser Plugin for GraphQL
$`## Parsing GraphQL Schema Files

Let's parse a .graphql file to extract types, queries, and mutations.
`

// This would work if the custom parser plugin is registered
// const graphqlContent = await workspace.readText("test-data/example.graphql")
// const graphqlData = await parsers.GRAPHQL(graphqlContent)
//
// $`Found ${graphqlData.types.length} types, ${graphqlData.queries.length} queries, ${graphqlData.mutations.length} mutations:`
//
// for (const type of graphqlData.types) {
//     $`- Type: ${type.name} (${type.fields.length} fields)`
// }

$`(Simulated) GraphQL parsing would extract:
- Types: User, Post
- Queries: user, users, post, posts
- Mutations: createUser, updateUser, deleteUser, createPost, updatePost
`

// Example 3: Using Global Utils Plugin
$`## Using Global Utilities

The global utils plugin provides helper functions:
`

// These would work if the global utils plugin is registered
// const slug = slugify("Hello World Example")
// const chunks = chunkArray([1, 2, 3, 4, 5, 6], 2)
// const sum = sum([10, 20, 30])

$`(Simulated) Global utilities:
- slugify("Hello World Example") → "hello-world-example"
- chunkArray([1, 2, 3, 4, 5, 6], 2) → [[1, 2], [3, 4], [5, 6]]
- sum([10, 20, 30]) → 60
- average([10, 20, 30]) → 20
- capitalize("hello world") → "Hello World"
`

// Example 4: Using Host Capabilities Plugin
$`## Using Host Capabilities

The host capabilities plugin adds database, API client, and resource management:
`

// This would work if the host capabilities plugin is registered
// const db = await host.database("postgresql://localhost/mydb")
// const users = await db.query("SELECT * FROM users WHERE active = $1", [true])
// await db.close()
//
// const api = host.apiClient("https://api.example.com")
// const response = await api.get("/users")

$`(Simulated) Host capabilities:
- Database queries with transaction support
- HTTP API client with GET, POST, PUT, DELETE methods
- Resource pool management for connection pooling
- Event emitter for custom events
`

// Example 5: Combining Multiple Plugins
$`## Combining Plugins

You can use multiple plugins together to build powerful workflows:
`

$`Example workflow:
1. Parse a GraphQL schema file using the custom parser plugin
2. Use global utilities to process and transform the data
3. Store results in a database using host capabilities
4. Send notifications via API client
5. Emit custom events for monitoring

This demonstrates how plugins can extend GenAIScript with domain-specific
functionality while keeping the core lightweight and focused.
`

$`## Plugin Benefits

✅ **Extensibility**: Add custom functionality without modifying core
✅ **Reusability**: Share plugins across multiple scripts
✅ **Modularity**: Enable/disable features as needed
✅ **Type Safety**: TypeScript definitions for better IDE support
✅ **Testing**: Write isolated tests for plugin functionality
`
