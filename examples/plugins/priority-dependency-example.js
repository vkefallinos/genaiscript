/**
 * Plugin Priority and Dependency Examples
 * 
 * Demonstrates how plugin priorities and dependencies work
 * to control plugin load order and execution sequence.
 */

// Example 1: Base Plugin (No dependencies, medium priority)
export const basePlugin = {
    name: "base-plugin",
    priority: 50,
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            
            // Provide base functionality
            context.global.logger = {
                log: (message) => console.log(`[Base] ${message}`),
                error: (message) => console.error(`[Base] ${message}`)
            }
            
            context.global.loadOrder = ["base-plugin"]
        })
        
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push((context) => {
            console.log("[Base Plugin] Initialized (priority: 50)")
        })
    }
}

// Example 2: High Priority Plugin (Runs first)
export const highPriorityPlugin = {
    name: "high-priority-plugin",
    priority: 100,
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            if (!context.global.loadOrder) context.global.loadOrder = []
            context.global.loadOrder.push("high-priority-plugin")
        })
        
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push((context) => {
            console.log("[High Priority Plugin] Initialized first (priority: 100)")
        })
    }
}

// Example 3: Low Priority Plugin (Runs last)
export const lowPriorityPlugin = {
    name: "low-priority-plugin",
    priority: 10,
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            if (!context.global.loadOrder) context.global.loadOrder = []
            context.global.loadOrder.push("low-priority-plugin")
        })
        
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push((context) => {
            console.log("[Low Priority Plugin] Initialized last (priority: 10)")
        })
    }
}

// Example 4: Plugin with Dependencies
export const dependentPlugin = {
    name: "dependent-plugin",
    dependencies: ["base-plugin"], // Requires base-plugin to load first
    priority: 75, // Even with higher priority, base-plugin loads first
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            
            // Can safely use base-plugin's functionality
            const logger = context.global.logger
            if (logger) {
                logger.log("Dependent plugin has access to logger")
            }
            
            if (!context.global.loadOrder) context.global.loadOrder = []
            context.global.loadOrder.push("dependent-plugin")
        })
        
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push((context) => {
            console.log("[Dependent Plugin] Initialized after base-plugin (priority: 75, depends on: base-plugin)")
        })
    }
}

// Example 5: Plugin with Multiple Dependencies
export const multiDependentPlugin = {
    name: "multi-dependent-plugin",
    dependencies: ["base-plugin", "dependent-plugin"],
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            if (!context.global.loadOrder) context.global.loadOrder = []
            context.global.loadOrder.push("multi-dependent-plugin")
            
            // Can use functionality from both dependencies
            const logger = context.global.logger
            if (logger) {
                logger.log("Multi-dependent plugin loaded last")
            }
        })
        
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push((context) => {
            console.log("[Multi-Dependent Plugin] Initialized after all dependencies")
            console.log("[Load Order] Plugins loaded in this order:", context.global?.loadOrder)
        })
    }
}

// Example 6: Plugin Chain Demonstration
// This shows a realistic plugin dependency chain

// Step 1: Core utilities
export const coreUtilsPlugin = {
    name: "core-utils",
    priority: 100,
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.utils = {
                formatDate: (date) => date.toISOString(),
                generateId: () => Math.random().toString(36).substr(2, 9)
            }
        })
    }
}

// Step 2: Database plugin depends on core-utils
export const databasePlugin = {
    name: "database",
    dependencies: ["core-utils"],
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.workspace) context.workspace = {}
            context.workspace.db = {
                query: async (sql) => {
                    const id = context.global?.utils?.generateId()
                    console.log(`[DB ${id}] Executing: ${sql}`)
                    return []
                }
            }
        })
    }
}

// Step 3: API client depends on database
export const apiClientPlugin = {
    name: "api-client",
    dependencies: ["database"],
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.host) context.host = {}
            context.host.api = {
                fetch: async (endpoint) => {
                    // Can use database functionality
                    await context.workspace?.db?.query(`SELECT * FROM ${endpoint}`)
                    return { data: [] }
                }
            }
        })
    }
}

// Step 4: App plugin depends on all of the above
export const appPlugin = {
    name: "app",
    dependencies: ["api-client", "database", "core-utils"],
    setup(extend, hooks, options) {
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push(async (context) => {
            console.log("[App Plugin] All dependencies loaded and ready")
            console.log("[App Plugin] Available APIs:")
            console.log("  - global.utils:", !!context.global?.utils)
            console.log("  - workspace.db:", !!context.workspace?.db)
            console.log("  - host.api:", !!context.host?.api)
        })
    }
}

// Default export for single plugin testing
export default {
    name: "priority-dependency-example",
    priority: 50,
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.exampleLoaded = true
        })
        
        console.log("[Priority & Dependency Example] Loaded")
        console.log("To see full examples, import specific plugins:")
        console.log("  - basePlugin, highPriorityPlugin, lowPriorityPlugin")
        console.log("  - dependentPlugin, multiDependentPlugin")
        console.log("  - coreUtilsPlugin, databasePlugin, apiClientPlugin, appPlugin")
    }
}
