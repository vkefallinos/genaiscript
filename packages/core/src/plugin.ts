/**
 * Plugin system for GenAIScript
 * Allows extending global, host, workspace, and parsers contexts
 */

import { MarkdownTrace } from "./trace"
import { CancellationOptions } from "./cancellation"

/**
 * Context provided to plugins for extension
 */
export interface ExtendContext {
    /**
     * Global context - utility functions and project-specific helpers
     * Can be extended with custom properties and methods
     */
    global: Record<string, any>

    /**
     * Host context - host capabilities (database connections, API clients, etc.)
     * Can be extended with custom host operations
     */
    host: Record<string, any>

    /**
     * Workspace context - workspace-level functionality
     * Can be extended with workspace operations
     */
    workspace: Record<string, any>

    /**
     * Parsers context - custom file parsers
     * Can be extended with custom file format parsers
     */
    parsers: Record<string, any>
}

/**
 * Plugin definition
 */
export interface Plugin {
    /**
     * Unique identifier for the plugin
     */
    id: string

    /**
     * Human-readable name of the plugin
     */
    name: string

    /**
     * Description of what the plugin does
     */
    description?: string

    /**
     * Version of the plugin
     */
    version?: string

    /**
     * Setup function called when the plugin is loaded
     * @param extend - Callback to extend contexts
     * @param options - Additional options including trace and cancellation
     */
    setup(
        extend: (context: ExtendContext) => void | Promise<void>,
        options?: PluginSetupOptions
    ): void | Promise<void>
}

/**
 * Options provided to plugin setup
 */
export interface PluginSetupOptions {
    /**
     * Trace for logging
     */
    trace?: MarkdownTrace

    /**
     * Cancellation token
     */
    cancellationToken?: AbortSignal

    /**
     * Model identifier
     */
    model?: string
}

/**
 * Registry for managing plugins
 */
export class PluginRegistry {
    private plugins: Plugin[] = []
    private extensions: Partial<ExtendContext> = {
        global: {},
        host: {},
        workspace: {},
        parsers: {},
    }
    private loaded: boolean = false

    /**
     * Register a plugin
     */
    register(plugin: Plugin): void {
        if (this.plugins.some((p) => p.id === plugin.id)) {
            throw new Error(`Plugin with id '${plugin.id}' is already registered`)
        }
        this.plugins.push(plugin)
        // Reset loaded flag when new plugins are registered
        this.loaded = false
    }

    /**
     * Register multiple plugins
     */
    registerAll(plugins: Plugin[]): void {
        for (const plugin of plugins) {
            this.register(plugin)
        }
    }

    /**
     * Load all registered plugins
     * Only loads plugins once unless clear() is called or new plugins are registered
     */
    async load(options?: PluginSetupOptions): Promise<void> {
        // Skip if already loaded
        if (this.loaded) {
            return
        }

        const { trace } = options || {}

        for (const plugin of this.plugins) {
            try {
                trace?.startDetails(`🔌 Loading plugin: ${plugin.name}`)
                
                await plugin.setup((context) => {
                    // Merge extensions from the plugin
                    this.mergeExtensions(context)
                }, options)

                trace?.itemValue("Plugin loaded", plugin.id)
                trace?.endDetails()
            } catch (error) {
                trace?.error(`Failed to load plugin ${plugin.id}: ${error}`)
                throw error
            }
        }

        this.loaded = true
    }

    /**
     * Merge plugin extensions into the registry
     */
    private mergeExtensions(context: Partial<ExtendContext>): void {
        if (context.global) {
            Object.assign(this.extensions.global, context.global)
        }
        if (context.host) {
            Object.assign(this.extensions.host, context.host)
        }
        if (context.workspace) {
            Object.assign(this.extensions.workspace, context.workspace)
        }
        if (context.parsers) {
            Object.assign(this.extensions.parsers, context.parsers)
        }
    }

    /**
     * Get all extensions for a specific context type
     */
    getExtensions<K extends keyof ExtendContext>(
        contextType: K
    ): ExtendContext[K] {
        return { ...(this.extensions[contextType] || {}) }
    }

    /**
     * Get all extensions
     */
    getAllExtensions(): Partial<ExtendContext> {
        return {
            global: this.getExtensions("global"),
            host: this.getExtensions("host"),
            workspace: this.getExtensions("workspace"),
            parsers: this.getExtensions("parsers"),
        }
    }

    /**
     * Clear all registered plugins and extensions
     */
    clear(): void {
        this.plugins = []
        this.extensions = {
            global: {},
            host: {},
            workspace: {},
            parsers: {},
        }
        this.loaded = false
    }

    /**
     * Get list of registered plugins
     */
    getPlugins(): readonly Plugin[] {
        return [...this.plugins]
    }
}

/**
 * Global plugin registry instance
 */
export const globalPluginRegistry = new PluginRegistry()
