# GenAIScript Plugin System Implementation

This document describes the foundational plugin system implemented for GenAIScript as outlined in issue #2.

## Overview

The plugin system enables extending GenAIScript's core contexts (global, host, workspace, parsers) through a declarative configuration-based approach. Plugins can be loaded from local files or npm packages.

## Architecture

### Core Components

1. **Plugin Type Definitions** (`packages/core/src/plugin.ts`)
   - `PluginDefinition`: Interface for plugin configuration
   - `PluginExtensionContext`: Context object with extension points
   - `plugin()`: Helper function to create plugin definitions
   - `LoadedPlugin`: Represents a loaded plugin with its extensions

2. **Plugin Loader** (`packages/core/src/pluginloader.ts`)
   - `loadPlugin()`: Loads a single plugin from file path or npm package
   - `loadPlugins()`: Loads multiple plugins from an array
   - `applyPluginExtensions()`: Applies plugin extensions to a context
   - Path resolution for both relative and absolute paths
   - Support for CommonJS and ES modules
   - Automatic extension detection (.js, .mjs, .cjs, .ts, .mts, .cts)

3. **Configuration Support** 
   - Updated `HostConfiguration` interface to include `plugins` array
   - Updated JSON schema to validate plugin configuration
   - Integrated plugin loading into config merging logic

4. **Public API** (`packages/core/src/pluginapi.ts`)
   - Exports all plugin-related types and functions
   - Designed to be imported as `genaiscript/plugin`

## Configuration

Plugins are configured in `genaiscript.config.json`:

```json
{
    "plugins": [
        "./plugins/my-plugin.js",
        "genaiscript-plugin-database"
    ]
}
```

### Plugin Sources

**Local Files:**
- Relative paths: `./plugins/my-plugin.js`, `../shared/plugin.mjs`
- Absolute paths: `/path/to/plugin.js`
- Extension auto-detection: `./plugin` will try `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`

**npm Packages:**
- Simple names: `genaiscript-plugin-database`
- Scoped packages: `@scope/genaiscript-plugin`

## Plugin API

### Creating a Plugin

```javascript
import { plugin } from "genaiscript/plugin"

export default plugin({
    name: 'my-plugin',
    setup(extend, options) {
        extend((context) => {
            // Extend global context
            if (!context.global) context.global = {}
            context.global.myFunction = () => { /* ... */ }
            
            // Extend parsers
            if (!context.parsers) context.parsers = {}
            context.parsers.readCustomFormat = async (file) => { /* ... */ }
            
            // Extend workspace
            if (!context.workspace) context.workspace = {}
            context.workspace.customQuery = async (query) => { /* ... */ }
            
            // Extend host
            if (!context.host) context.host = {}
            context.host.customService = () => { /* ... */ }
        })
    }
})
```

### Extension Points

Plugins can extend four context areas:

1. **global**: Global utility functions and helpers
2. **host**: Host capabilities and services
3. **workspace**: Workspace file system operations and queries
4. **parsers**: File format parsers

### Setup Function

The `setup` function receives:
- `extend`: Callback to register extensions
- `options`: Optional configuration object

The `setup` function can be:
- Synchronous: `setup(extend) { ... }`
- Asynchronous: `async setup(extend) { await ...; ... }`

### Multiple Extensions

A plugin can register multiple extensions:

```javascript
setup(extend) {
    extend((context) => {
        // First extension
    })
    
    extend((context) => {
        // Second extension
    })
}
```

Extensions are applied in order of registration.

## Validation

The plugin loader validates:

1. **Module Structure**
   - Must export default or named `plugin` export
   - Export must be a valid `PluginDefinition` object

2. **Required Fields**
   - `name`: String, unique identifier for the plugin
   - `setup`: Function that accepts `extend` callback

3. **Runtime Validation**
   - Plugin setup must not throw errors
   - Extensions must not fail when applied

Error messages provide clear guidance on what's wrong and how to fix it.

## Testing

Comprehensive test suites included:

1. **Plugin Core Tests** (`plugin.test.ts`)
   - Plugin definition creation
   - Setup function execution
   - Extension registration
   - Context extension

2. **Plugin Loader Tests** (`pluginloader.test.ts`)
   - Loading from local files
   - Path resolution (relative, absolute, extensions)
   - Named vs default exports
   - Multiple plugin loading
   - Extension application
   - Error handling

3. **Configuration Tests** (`config.plugin.test.ts`)
   - Schema validation
   - Config file parsing
   - Plugin path formats
   - Mixed local and npm plugins

All tests use Node.js built-in test runner and follow existing patterns in the codebase.

## Example Usage

See `examples/plugins/` directory for:
- `example-plugin.mjs`: Complete working example
- `README.md`: Detailed documentation
- `genaiscript.config.example.json`: Example configuration

## Implementation Details

### File Resolution Algorithm

1. Check if path is absolute → use as-is
2. Resolve relative to project root
3. Try exact path
4. Try with common extensions (.js, .mjs, .cjs, .ts, .mts, .cts)
5. If not found, treat as npm package

### Module Loading

- Uses dynamic `import()` for ES modules
- Works with both CommonJS and ES module formats
- Converts file paths to `file://` URLs for proper import
- Handles scoped npm packages

### Extension Application

1. Plugins are loaded during config initialization
2. Setup functions are called immediately
3. Extensions are collected but not applied yet
4. Extensions are applied when context is created
5. Applied in plugin registration order
6. Each plugin's extensions applied in order

## Future Enhancements

The current implementation provides the foundation for:

1. **Lifecycle Hooks** (Issue #3)
   - beforeRun, afterRun, onError hooks
   - Plugin initialization and cleanup

2. **Conflict Resolution** (Issue #3)
   - Priority-based extension ordering
   - Namespace isolation
   - Override policies

3. **Plugin Discovery**
   - Auto-discovery of plugins in specific directories
   - Plugin marketplace integration

4. **Hot Reloading**
   - Development mode with plugin hot-reload
   - Configuration file watching

## Migration Path

The plugin system is designed to be:
- **Non-breaking**: Existing code continues to work
- **Opt-in**: Plugins only load when configured
- **Backward compatible**: No changes to existing APIs

## Files Changed

- `packages/core/src/plugin.ts` - Plugin type definitions
- `packages/core/src/pluginloader.ts` - Plugin loading logic
- `packages/core/src/pluginapi.ts` - Public API exports
- `packages/core/src/hostconfiguration.ts` - Config interface update
- `packages/core/src/config.ts` - Config merging update
- `docs/public/schemas/config.json` - Schema update
- `packages/core/src/plugin.test.ts` - Core plugin tests
- `packages/core/src/pluginloader.test.ts` - Loader tests
- `packages/core/src/config.plugin.test.ts` - Config tests
- `examples/plugins/` - Example plugin and documentation

## Total Impact

- **Lines Added**: ~1,500 lines
- **New Files**: 9 files
- **Modified Files**: 3 files
- **Test Coverage**: ~450 test lines across 3 test files
- **Documentation**: Comprehensive examples and README

## Compliance

This implementation satisfies all requirements from issue #2:

- ✅ Define plugin registration interface
- ✅ Configuration file support for plugins array
- ✅ Plugin discovery and loading (local + npm)
- ✅ Plugin validation with helpful errors
- ✅ Comprehensive unit tests
- ✅ TypeScript type definitions
- ✅ Extensible design for future enhancements
