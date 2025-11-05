# GenAIScript Plugin Examples

This directory contains example plugins demonstrating how to extend GenAIScript functionality using the plugin API.

## Plugin Architecture

Plugins allow you to extend GenAIScript in four key areas:

1. **Global Context** - Add utility functions and helpers available throughout script execution
2. **Host Context** - Register custom host capabilities (e.g., database connections, API clients)
3. **Workspace Context** - Add workspace-level functionality (e.g., custom file operations)
4. **Parsers Context** - Register custom file parsers for new file formats

## Creating a Plugin

A plugin is a JavaScript/TypeScript object that implements the `Plugin` interface:

```typescript
interface Plugin {
    id: string              // Unique identifier
    name: string            // Human-readable name
    description?: string    // What the plugin does
    version?: string        // Plugin version
    setup(extend, options)  // Setup function
}
```

### The `setup` Function

The setup function receives two parameters:

1. **extend** - A callback function that receives an `ExtendContext` object with:
   - `global` - Object to add global utilities
   - `host` - Object to add host capabilities
   - `workspace` - Object to add workspace operations
   - `parsers` - Object to add custom parsers

2. **options** - Optional configuration:
   - `trace` - For logging
   - `cancellationToken` - For cancellation support
   - `model` - Model identifier

### Example: Basic Plugin

```typescript
const myPlugin = {
    id: "my-plugin",
    name: "My Plugin",
    description: "Adds custom functionality",
    version: "1.0.0",
    
    setup(extend, options) {
        extend({
            global: {
                myUtility() {
                    return "Hello from plugin!"
                }
            }
        })
    }
}
```

## Available Examples

### 1. Custom Parser Plugin (`custom-parser-plugin.js`)

Demonstrates how to add a custom file parser for `.proto` files (Protocol Buffers).

**Key Features:**
- Registers a new parser for `.proto` format
- Shows async parser implementation
- Demonstrates error handling in parsers

**Usage:**
```typescript
const result = await parsers.PROTO("path/to/file.proto")
```

### 2. Global Utilities Plugin (`global-utils-plugin.js`)

Adds utility functions to the global context.

**Key Features:**
- String manipulation utilities
- Data transformation helpers
- Math utilities

**Usage:**
```typescript
const slug = slugify("Hello World")  // "hello-world"
const chunks = chunkArray([1,2,3,4], 2)  // [[1,2], [3,4]]
```

### 3. Host Capabilities Plugin (`host-capabilities-plugin.js`)

Extends host with custom capabilities like database connections.

**Key Features:**
- Mock database connection
- Custom API client
- Resource management

**Usage:**
```typescript
const db = await host.database("mydb")
const result = await db.query("SELECT * FROM users")
```

## Registering Plugins

To use plugins in your GenAIScript environment:

```typescript
import { globalPluginRegistry } from "genaiscript/core"
import myPlugin from "./my-plugin"

// Register a single plugin
globalPluginRegistry.register(myPlugin)

// Register multiple plugins
globalPluginRegistry.registerAll([plugin1, plugin2, plugin3])
```

Plugins are loaded automatically when a prompt context is created.

## Best Practices

1. **Unique IDs**: Always use unique plugin IDs to avoid conflicts
2. **Error Handling**: Implement proper error handling in plugin functions
3. **Documentation**: Document your plugin functions and their parameters
4. **Type Safety**: Use TypeScript for better type safety and IDE support
5. **Testing**: Write tests for your plugin functionality
6. **Async Operations**: Support cancellation tokens for long-running operations

## API Reference

### ExtendContext

```typescript
interface ExtendContext {
    global: Record<string, any>     // Global utilities
    host: Record<string, any>       // Host capabilities  
    workspace: Record<string, any>  // Workspace operations
    parsers: Record<string, any>    // Custom parsers
}
```

### PluginSetupOptions

```typescript
interface PluginSetupOptions {
    trace?: any               // Trace for logging
    cancellationToken?: AbortSignal  // Cancellation support
    model?: string            // Model identifier
}
```

## Contributing

When creating plugins:

1. Follow the naming convention: `<functionality>-plugin.js`
2. Include comprehensive documentation
3. Add tests for plugin functionality
4. Ensure backward compatibility
5. Handle edge cases gracefully

## More Information

For more information on GenAIScript plugin development, see the main documentation at:
- [Plugin Architecture Guide](../../docs/plugins.md)
- [API Reference](../../docs/api-reference.md)
