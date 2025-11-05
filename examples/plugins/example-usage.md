# Plugin Usage Examples

This document demonstrates how to use the example plugins included in this directory.

## Setup

First, register the plugins you want to use:

```typescript
import { globalPluginRegistry } from "genaiscript/core"
import customParserPlugin from "./examples/plugins/custom-parser-plugin"
import globalUtilsPlugin from "./examples/plugins/global-utils-plugin"
import hostCapabilitiesPlugin from "./examples/plugins/host-capabilities-plugin"

// Register plugins
globalPluginRegistry.registerAll([
    customParserPlugin,
    globalUtilsPlugin,
    hostCapabilitiesPlugin,
])
```

Plugins will be automatically loaded when a prompt context is created.

## Using Custom Parser Plugin

### Parsing Protocol Buffer Files

```typescript
// In your GenAIScript
const protoFile = await workspace.readText("schema.proto")
const parsed = await parsers.PROTO(protoFile)

console.log(`Found ${parsed.messages.length} messages`)
console.log(`Found ${parsed.services.length} services`)

// Iterate over messages
parsed.messages.forEach(message => {
    console.log(`Message: ${message.name}`)
    message.fields.forEach(field => {
        console.log(`  Field: ${field}`)
    })
})
```

### Parsing GraphQL Schema Files

```typescript
// In your GenAIScript
const schemaFile = await workspace.readText("schema.graphql")
const parsed = await parsers.GRAPHQL(schemaFile)

console.log(`Found ${parsed.types.length} types`)
console.log(`Found ${parsed.queries.length} queries`)
console.log(`Found ${parsed.mutations.length} mutations`)

// Iterate over types
parsed.types.forEach(type => {
    console.log(`Type: ${type.name}`)
    type.fields.forEach(field => {
        console.log(`  ${field.name}: ${field.type}`)
    })
})
```

### Example Protocol Buffer Content

```proto
syntax = "proto3";

message User {
    int32 id = 1;
    string name = 2;
    string email = 3;
}

service UserService {
    rpc GetUser (GetUserRequest) returns (User);
    rpc CreateUser (CreateUserRequest) returns (User);
}
```

### Example GraphQL Schema Content

```graphql
type User {
    id: ID!
    name: String!
    email: String!
}

type Query {
    user(id: ID!): User
    users: [User!]!
}

type Mutation {
    createUser(name: String!, email: String!): User!
    updateUser(id: ID!, name: String, email: String): User
}
```

## Using Global Utils Plugin

The global utilities plugin adds helpful functions to the global context:

### String Manipulation

```typescript
// Slugify text
const slug = slugify("Hello World Example")
// Result: "hello-world-example"

// Capitalize words
const title = capitalize("hello world")
// Result: "Hello World"

// Truncate text
const short = truncate("This is a very long text that needs to be shortened", 20)
// Result: "This is a very lo..."
```

### Array Operations

```typescript
// Chunk array
const items = [1, 2, 3, 4, 5, 6, 7, 8]
const chunks = chunkArray(items, 3)
// Result: [[1, 2, 3], [4, 5, 6], [7, 8]]

// Get unique values
const numbers = [1, 2, 2, 3, 3, 3, 4]
const unique = unique(numbers)
// Result: [1, 2, 3, 4]

// Group by property
const users = [
    { name: "Alice", role: "admin" },
    { name: "Bob", role: "user" },
    { name: "Charlie", role: "admin" }
]
const grouped = groupBy(users, "role")
// Result: {
//   admin: [{ name: "Alice", role: "admin" }, { name: "Charlie", role: "admin" }],
//   user: [{ name: "Bob", role: "user" }]
// }
```

### Math Operations

```typescript
// Sum array
const numbers = [1, 2, 3, 4, 5]
const total = sum(numbers)
// Result: 15

// Average
const avg = average(numbers)
// Result: 3

// Format number
const formatted = formatNumber(1234567)
// Result: "1,234,567"
```

### Data Transformation

```typescript
// Deep clone
const original = { name: "Alice", meta: { age: 30 } }
const cloned = deepClone(original)
cloned.meta.age = 31
// original.meta.age is still 30

// Create hash map
const users = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
]
const userMap = toHashMap(users, user => user.id)
// Result: { 1: { id: 1, name: "Alice" }, 2: { id: 2, name: "Bob" } }
```

### Async Utilities

```typescript
// Retry with exponential backoff
const result = await retry(async () => {
    const response = await fetch("https://api.example.com/data")
    return response.json()
}, 3, 1000)
// Retries up to 3 times with exponential backoff starting at 1000ms
```

## Using Host Capabilities Plugin

The host capabilities plugin extends the host context with advanced features:

### Database Connection

```typescript
// Connect to database
const db = await host.database("postgresql://localhost/mydb")

// Execute query
const result = await db.query("SELECT * FROM users WHERE active = $1", [true])
console.log(`Found ${result.rowCount} active users`)

// Use transactions
await db.transaction(async (db) => {
    await db.query("INSERT INTO users (name, email) VALUES ($1, $2)", ["Alice", "alice@example.com"])
    await db.query("INSERT INTO audit_log (action) VALUES ($1)", ["user_created"])
    // Both queries succeed or both fail
})

// Close connection
await db.close()
```

### API Client

```typescript
// Create API client
const api = host.apiClient("https://api.example.com", {
    headers: {
        "Authorization": "Bearer token",
        "Content-Type": "application/json"
    }
})

// Make GET request
const users = await api.get("/users", { limit: 10 })
console.log(`Status: ${users.status}`)
console.log(`Data:`, users.data)

// Make POST request
const newUser = await api.post("/users", {
    name: "Alice",
    email: "alice@example.com"
})

// Make PUT request
const updated = await api.put("/users/123", {
    name: "Alice Smith"
})

// Make DELETE request
await api.delete("/users/456")
```

### Resource Pool

```typescript
// Create resource pool
const pool = host.resourcePool(
    async () => {
        // Factory function to create resources
        return await host.database("postgresql://localhost/mydb")
    },
    { minSize: 2, maxSize: 10 }
)

// Acquire resource
const db = await pool.acquire()
try {
    const result = await db.query("SELECT * FROM users")
    // Use the database connection
} finally {
    // Always release resource back to pool
    await pool.release(db)
}

// Get pool statistics
const stats = pool.stats()
console.log(`Total: ${stats.total}, Available: ${stats.available}, In use: ${stats.inUse}`)

// Drain pool when done
await pool.drain()
```

### Event Emitter

```typescript
// Create event emitter
const events = host.eventEmitter()

// Register event listener
events.on("user:created", (data) => {
    console.log(`User created: ${data.name}`)
})

// Emit events
events.emit("user:created", { name: "Alice", email: "alice@example.com" })

// Remove event listener
const handler = (data) => console.log(data)
events.on("user:updated", handler)
events.off("user:updated", handler)
```

## Combining Multiple Plugins

You can use features from multiple plugins together:

```typescript
// Parse a GraphQL schema file
const schemaFile = await workspace.readText("schema.graphql")
const schema = await parsers.GRAPHQL(schemaFile)

// Use global utilities to process the data
const typeNames = schema.types.map(t => t.name)
const uniqueTypes = unique(typeNames)
const sluggedTypes = uniqueTypes.map(name => slugify(name))

// Store in database using host capabilities
const db = await host.database("postgresql://localhost/mydb")
for (const type of schema.types) {
    await db.query(
        "INSERT INTO graphql_types (name, field_count) VALUES ($1, $2)",
        [type.name, type.fields.length]
    )
}
await db.close()

// Create API client to send results
const api = host.apiClient("https://api.example.com")
await api.post("/schema/analyzed", {
    types: typeNames,
    totalFields: sum(schema.types.map(t => t.fields.length))
})
```

## Testing Plugins

When writing tests for scripts that use plugins, make sure to register the plugins before running your tests:

```typescript
import { beforeEach } from "node:test"
import { globalPluginRegistry } from "genaiscript/core"
import myPlugins from "./my-plugins"

beforeEach(() => {
    globalPluginRegistry.clear()
    globalPluginRegistry.registerAll(myPlugins)
})
```

## Best Practices

1. **Register plugins early**: Register all plugins at the start of your script
2. **Clean up resources**: Always close database connections, drain resource pools
3. **Handle errors**: Wrap plugin calls in try-catch blocks for error handling
4. **Use types**: TypeScript provides autocomplete for plugin functions
5. **Document usage**: Add comments explaining how custom parsers work
6. **Test thoroughly**: Write tests for scripts that rely on plugin functionality

## Troubleshooting

### Plugin not available

If a plugin function is not available, check:
1. Plugin is registered before context creation
2. Plugin setup function calls `extend()` correctly
3. No errors during plugin loading (check trace logs)

### Type errors

If you get TypeScript errors:
1. Ensure plugin types are properly defined
2. Use type assertions when necessary: `(parsers as any).CUSTOM(...)`
3. Consider creating ambient type declarations for plugins

### Performance issues

If plugins cause slowdowns:
1. Use resource pools for expensive operations
2. Implement caching where appropriate
3. Consider lazy loading for rarely used plugins
4. Profile plugin operations to identify bottlenecks
