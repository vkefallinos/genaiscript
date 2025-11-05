/**
 * Manual verification script for plugin types and functionality
 * This file is used to verify that the plugin system compiles correctly
 */

import { Plugin, PluginRegistry, ExtendContext, globalPluginRegistry } from "./plugin"

// Verify Plugin interface can be implemented
const testPlugin: Plugin = {
    id: "test-plugin",
    name: "Test Plugin",
    description: "A test plugin",
    version: "1.0.0",
    
    setup(extend, options) {
        // Verify extend callback signature
        extend({
            global: {
                testFunction() {
                    return "test"
                }
            },
            host: {
                testHost() {
                    return "host test"
                }
            },
            workspace: {
                testWorkspace() {
                    return "workspace test"
                }
            },
            parsers: {
                TEST(content: string) {
                    return { parsed: content }
                }
            }
        })
    }
}

// Verify PluginRegistry can be instantiated
const registry = new PluginRegistry()

// Verify registry methods
registry.register(testPlugin)
registry.registerAll([testPlugin])

// Verify async operations
async function testAsyncOperations() {
    await registry.load()
    
    const globalExtensions = registry.getExtensions("global")
    const hostExtensions = registry.getExtensions("host")
    const workspaceExtensions = registry.getExtensions("workspace")
    const parsersExtensions = registry.getExtensions("parsers")
    
    const allExtensions = registry.getAllExtensions()
    const plugins = registry.getPlugins()
    
    registry.clear()
}

// Verify global registry is accessible
globalPluginRegistry.register(testPlugin)

// Verify ExtendContext type can be used
const testExtendContext: ExtendContext = {
    global: {},
    host: {},
    workspace: {},
    parsers: {}
}

// Test that types are exported properly
export type { Plugin, ExtendContext, PluginRegistry }
