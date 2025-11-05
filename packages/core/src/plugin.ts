/**
 * Plugin system for GenAIScript
 * Allows extending core contexts through configuration
 */

/**
 * Context objects that can be extended by plugins
 */
export interface PluginExtensionContext {
    /**
     * Global context extension point
     */
    global?: Record<string, any>

    /**
     * Host context extension point
     */
    host?: Record<string, any>

    /**
     * Workspace context extension point
     */
    workspace?: Record<string, any>

    /**
     * Parsers context extension point
     */
    parsers?: Record<string, any>
}

/**
 * Lifecycle hook context passed to lifecycle callbacks
 */
export interface PluginLifecycleContext {
    /**
     * Script name being executed
     */
    scriptName?: string

    /**
     * Additional context data
     */
    [key: string]: any
}

/**
 * Lifecycle hook callback function
 */
export type LifecycleHook = (
    context: PluginLifecycleContext
) => void | Promise<void>

/**
 * Error context passed to onError hook
 */
export interface PluginErrorContext extends PluginLifecycleContext {
    /**
     * The error that occurred
     */
    error: Error
}

/**
 * Lifecycle hooks that plugins can register
 */
export interface PluginLifecycleHooks {
    /**
     * Called before a script execution starts
     */
    beforeRun?: LifecycleHook[]

    /**
     * Called after a script execution completes
     */
    afterRun?: LifecycleHook[]

    /**
     * Called when an error occurs during execution
     */
    onError?: Array<(context: PluginErrorContext) => void | Promise<void>>
}

/**
 * Conflict resolution strategy for handling duplicate property extensions
 */
export enum ConflictResolutionStrategy {
    /**
     * Higher priority plugin wins
     */
    PRIORITY = "priority",

    /**
     * Warn but allow override (last wins)
     */
    WARN_OVERRIDE = "warn_override",

    /**
     * Merge compatible types (objects, arrays)
     */
    MERGE = "merge",

    /**
     * Throw error on conflict
     */
    ERROR = "error",
}

/**
 * Function type for plugin setup callback
 */
export type PluginSetupFunction = (
    extend: (callback: (context: PluginExtensionContext) => void) => void,
    hooks: PluginLifecycleHooks,
    options?: Record<string, any>
) => void | Promise<void>

/**
 * Plugin configuration object
 */
export interface PluginDefinition {
    /**
     * Unique name for the plugin
     */
    name: string

    /**
     * Setup function called when the plugin is loaded
     */
    setup: PluginSetupFunction

    /**
     * Priority for plugin execution order (higher = executed first)
     * Default: 0
     */
    priority?: number

    /**
     * Conflict resolution strategy for this plugin
     * Default: WARN_OVERRIDE
     */
    conflictResolution?: ConflictResolutionStrategy

    /**
     * Plugin dependencies (names of plugins that must be loaded first)
     */
    dependencies?: string[]
}

/**
 * Plugin module that can be loaded
 */
export interface PluginModule {
    /**
     * Default export should be the plugin definition
     */
    default?: PluginDefinition

    /**
     * Or named export as plugin
     */
    plugin?: PluginDefinition
}

/**
 * Creates a plugin definition
 * @param definition - Plugin configuration
 * @returns Plugin definition object
 */
export function plugin(definition: PluginDefinition): PluginDefinition {
    return definition
}

/**
 * Loaded plugin with its extension callbacks and lifecycle hooks
 */
export interface LoadedPlugin {
    /**
     * Plugin definition
     */
    definition: PluginDefinition

    /**
     * Source of the plugin (file path or package name)
     */
    source: string

    /**
     * Extension callbacks registered by the plugin
     */
    extensions: Array<(context: PluginExtensionContext) => void>

    /**
     * Lifecycle hooks registered by the plugin
     */
    lifecycleHooks: PluginLifecycleHooks
}
