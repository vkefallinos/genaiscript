/**
 * Plugin loader for GenAIScript
 * Handles loading plugins from local files and npm packages
 */

import { resolve, isAbsolute, dirname } from "path"
import { pathToFileURL } from "url"
import { tryStat } from "./fs"
import {
    PluginDefinition,
    PluginModule,
    LoadedPlugin,
    PluginExtensionContext,
    PluginLifecycleHooks,
    PluginLifecycleContext,
    PluginErrorContext,
    ConflictResolutionStrategy,
} from "./plugin"
import debug from "debug"

const dbg = debug("genaiscript:pluginloader")

/**
 * Validates that a loaded module conforms to the plugin API
 */
function validatePlugin(module: any, source: string): PluginDefinition {
    // Check for default export
    let plugin: PluginDefinition | undefined = module?.default || module?.plugin

    if (!plugin) {
        throw new Error(
            `Plugin from '${source}' must export a default plugin definition or named 'plugin' export`
        )
    }

    // Validate required fields
    if (!plugin.name || typeof plugin.name !== "string") {
        throw new Error(
            `Plugin from '${source}' must have a 'name' property of type string`
        )
    }

    if (!plugin.setup || typeof plugin.setup !== "function") {
        throw new Error(
            `Plugin from '${source}' must have a 'setup' property of type function`
        )
    }

    dbg(`validated plugin '${plugin.name}' from ${source}`)
    return plugin
}

/**
 * Resolves a plugin path relative to the project root
 */
async function resolvePluginPath(
    pluginPath: string,
    projectRoot: string
): Promise<string | null> {
    // If absolute path, use as-is
    if (isAbsolute(pluginPath)) {
        const stat = await tryStat(pluginPath)
        return stat?.isFile() ? pluginPath : null
    }

    // Resolve relative to project root
    const resolvedPath = resolve(projectRoot, pluginPath)
    const stat = await tryStat(resolvedPath)
    if (stat?.isFile()) {
        return resolvedPath
    }

    // Try with common extensions
    for (const ext of [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]) {
        const pathWithExt = resolvedPath + ext
        const statExt = await tryStat(pathWithExt)
        if (statExt?.isFile()) {
            return pathWithExt
        }
    }

    return null
}

/**
 * Loads a plugin from a local file path
 */
async function loadPluginFromFile(
    filePath: string,
    projectRoot: string
): Promise<PluginDefinition> {
    dbg(`loading plugin from file: ${filePath}`)

    const resolvedPath = await resolvePluginPath(filePath, projectRoot)
    if (!resolvedPath) {
        throw new Error(`Plugin file not found: ${filePath}`)
    }

    dbg(`resolved plugin path: ${resolvedPath}`)

    try {
        // Import the module
        const fileUrl = pathToFileURL(resolvedPath).href
        const module: PluginModule = await import(fileUrl)

        return validatePlugin(module, filePath)
    } catch (error) {
        throw new Error(
            `Failed to load plugin from '${filePath}': ${error.message}`
        )
    }
}

/**
 * Loads a plugin from an npm package
 */
async function loadPluginFromPackage(
    packageName: string,
    projectRoot: string
): Promise<PluginDefinition> {
    dbg(`loading plugin from package: ${packageName}`)

    try {
        // Try to resolve the package from project's node_modules
        // This will work with both CommonJS and ES modules
        const module: PluginModule = await import(packageName)

        return validatePlugin(module, packageName)
    } catch (error) {
        // If import fails, try to resolve from project root's node_modules
        try {
            const packagePath = resolve(
                projectRoot,
                "node_modules",
                packageName
            )
            const stat = await tryStat(packagePath)
            if (stat?.isDirectory()) {
                const fileUrl = pathToFileURL(packagePath).href
                const module: PluginModule = await import(fileUrl)
                return validatePlugin(module, packageName)
            }
        } catch (resolveError) {
            dbg(`failed to resolve package from node_modules: ${resolveError}`)
        }

        throw new Error(
            `Failed to load plugin package '${packageName}': ${error.message}. Make sure the package is installed.`
        )
    }
}

/**
 * Determines if a plugin string is a file path or package name
 */
function isFilePath(pluginString: string): boolean {
    // Relative paths start with ./ or ../
    // Absolute paths start with / or a drive letter on Windows
    return (
        pluginString.startsWith("./") ||
        pluginString.startsWith("../") ||
        pluginString.startsWith("/") ||
        /^[A-Za-z]:/.test(pluginString)
    )
}

/**
 * Loads a single plugin from a string identifier
 */
export async function loadPlugin(
    pluginIdentifier: string,
    projectRoot: string
): Promise<LoadedPlugin> {
    dbg(`loading plugin: ${pluginIdentifier}`)

    let definition: PluginDefinition

    if (isFilePath(pluginIdentifier)) {
        definition = await loadPluginFromFile(pluginIdentifier, projectRoot)
    } else {
        definition = await loadPluginFromPackage(pluginIdentifier, projectRoot)
    }

    const extensions: Array<(context: PluginExtensionContext) => void> = []
    const lifecycleHooks: PluginLifecycleHooks = {
        beforeRun: [],
        afterRun: [],
        onError: [],
    }

    // Create the extend callback
    const extend = (
        callback: (context: PluginExtensionContext) => void
    ): void => {
        extensions.push(callback)
    }

    // Call the setup function
    try {
        await definition.setup(extend, lifecycleHooks)
        dbg(
            `plugin '${definition.name}' setup complete with ${extensions.length} extensions, ` +
            `${lifecycleHooks.beforeRun?.length || 0} beforeRun hooks, ` +
            `${lifecycleHooks.afterRun?.length || 0} afterRun hooks, ` +
            `${lifecycleHooks.onError?.length || 0} onError hooks`
        )
    } catch (error) {
        throw new Error(
            `Plugin '${definition.name}' setup failed: ${error.message}`
        )
    }

    return {
        definition,
        source: pluginIdentifier,
        extensions,
        lifecycleHooks,
    }
}

/**
 * Sorts plugins by priority and resolves dependencies
 */
function sortPluginsByPriorityAndDependencies(
    plugins: LoadedPlugin[]
): LoadedPlugin[] {
    dbg("sorting plugins by priority and dependencies")
    
    // Create a map for quick lookup
    const pluginMap = new Map<string, LoadedPlugin>()
    plugins.forEach((p) => pluginMap.set(p.definition.name, p))

    // Detect circular dependencies
    const detectCircular = (
        plugin: LoadedPlugin,
        visited: Set<string>,
        stack: Set<string>
    ): string[] | null => {
        const name = plugin.definition.name
        if (stack.has(name)) {
            return [name]
        }
        if (visited.has(name)) {
            return null
        }

        visited.add(name)
        stack.add(name)

        for (const dep of plugin.definition.dependencies || []) {
            const depPlugin = pluginMap.get(dep)
            if (depPlugin) {
                const cycle = detectCircular(depPlugin, visited, stack)
                if (cycle) {
                    return [name, ...cycle]
                }
            }
        }

        stack.delete(name)
        return null
    }

    // Check for circular dependencies
    const visited = new Set<string>()
    const stack = new Set<string>()
    for (const plugin of plugins) {
        const cycle = detectCircular(plugin, visited, stack)
        if (cycle) {
            const cycleStr = cycle.join(" -> ")
            dbg(`circular dependency detected: ${cycleStr}`)
            throw new Error(
                `Circular dependency detected in plugins: ${cycleStr}`
            )
        }
    }

    // Topological sort with priority
    const sorted: LoadedPlugin[] = []
    const resolved = new Set<string>()

    const resolve = (plugin: LoadedPlugin): void => {
        const name = plugin.definition.name
        if (resolved.has(name)) {
            return
        }

        // Resolve dependencies first
        for (const dep of plugin.definition.dependencies || []) {
            const depPlugin = pluginMap.get(dep)
            if (!depPlugin) {
                throw new Error(
                    `Plugin '${name}' depends on '${dep}' which is not loaded`
                )
            }
            resolve(depPlugin)
        }

        sorted.push(plugin)
        resolved.add(name)
    }

    // Sort by priority first (higher priority first)
    const byPriority = [...plugins].sort((a, b) => {
        const priorityA = a.definition.priority || 0
        const priorityB = b.definition.priority || 0
        return priorityB - priorityA
    })

    // Then resolve dependencies
    for (const plugin of byPriority) {
        resolve(plugin)
    }

    dbg(
        `sorted plugins: ${sorted.map((p) => `${p.definition.name}(${p.definition.priority || 0})`).join(", ")}`
    )

    return sorted
}

/**
 * Loads multiple plugins from an array of identifiers
 */
export async function loadPlugins(
    pluginIdentifiers: string[],
    projectRoot: string
): Promise<LoadedPlugin[]> {
    dbg(`loading ${pluginIdentifiers.length} plugins`)

    const plugins: LoadedPlugin[] = []
    const errors: Array<{ identifier: string; error: Error }> = []

    for (const identifier of pluginIdentifiers) {
        try {
            const plugin = await loadPlugin(identifier, projectRoot)
            plugins.push(plugin)
        } catch (error) {
            dbg(`failed to load plugin '${identifier}': ${error.message}`)
            errors.push({ identifier, error })
        }
    }

    // If there were errors, throw with details
    if (errors.length > 0) {
        const errorMessages = errors
            .map((e) => `  - ${e.identifier}: ${e.error.message}`)
            .join("\n")
        throw new Error(`Failed to load plugins:\n${errorMessages}`)
    }

    // Sort plugins by priority and resolve dependencies
    try {
        return sortPluginsByPriorityAndDependencies(plugins)
    } catch (error) {
        throw new Error(`Failed to sort plugins: ${error.message}`)
    }
}

/**
 * Tracks which plugin set a property for conflict detection
 */
interface PropertyOwner {
    pluginName: string
    path: string
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
    if (Array.isArray(target) && Array.isArray(source)) {
        return [...target, ...source]
    }
    if (
        typeof target === "object" &&
        target !== null &&
        typeof source === "object" &&
        source !== null &&
        !Array.isArray(target) &&
        !Array.isArray(source)
    ) {
        const result = { ...target }
        for (const key in source) {
            if (key in result) {
                result[key] = deepMerge(result[key], source[key])
            } else {
                result[key] = source[key]
            }
        }
        return result
    }
    return source
}

/**
 * Detects conflicts when applying extensions
 */
function applyExtensionWithConflictDetection(
    extension: (context: PluginExtensionContext) => void,
    context: PluginExtensionContext,
    plugin: LoadedPlugin,
    propertyOwners: Map<string, PropertyOwner>
): void {
    // Create a proxy to track property assignments
    const contextBefore = JSON.parse(JSON.stringify(context))
    
    // Apply the extension
    extension(context)
    
    // Check for conflicts
    const strategy =
        plugin.definition.conflictResolution ||
        ConflictResolutionStrategy.WARN_OVERRIDE
    
    for (const contextKey of ["global", "host", "workspace", "parsers"] as const) {
        if (!context[contextKey]) continue
        
        const beforeObj = contextBefore[contextKey] || {}
        const afterObj = context[contextKey]
        
        for (const propKey in afterObj) {
            const ownerKey = `${contextKey}.${propKey}`
            
            // Check if property existed before and was set by a different plugin
            if (beforeObj[propKey] !== undefined) {
                const owner = propertyOwners.get(ownerKey)
                
                if (owner && owner.pluginName !== plugin.definition.name) {
                    const message = `Plugin '${plugin.definition.name}' is overriding '${ownerKey}' previously set by plugin '${owner.pluginName}'`
                    
                    switch (strategy) {
                        case ConflictResolutionStrategy.ERROR:
                            throw new Error(message)
                        
                        case ConflictResolutionStrategy.WARN_OVERRIDE:
                            dbg(`WARNING: ${message}`)
                            console.warn(`[Plugin Warning] ${message}`)
                            propertyOwners.set(ownerKey, {
                                pluginName: plugin.definition.name,
                                path: ownerKey,
                            })
                            break
                        
                        case ConflictResolutionStrategy.MERGE:
                            dbg(`Merging ${ownerKey} from '${owner.pluginName}' and '${plugin.definition.name}'`)
                            try {
                                afterObj[propKey] = deepMerge(
                                    beforeObj[propKey],
                                    afterObj[propKey]
                                )
                            } catch (error) {
                                dbg(`Failed to merge ${ownerKey}: ${error.message}`)
                                console.warn(
                                    `[Plugin Warning] Failed to merge '${ownerKey}': ${error.message}. Using override.`
                                )
                            }
                            break
                        
                        case ConflictResolutionStrategy.PRIORITY:
                            // Priority already handled by plugin ordering
                            // Higher priority plugin overwrites
                            dbg(`Priority override: ${message}`)
                            propertyOwners.set(ownerKey, {
                                pluginName: plugin.definition.name,
                                path: ownerKey,
                            })
                            break
                    }
                } else if (!owner) {
                    // Track this property
                    propertyOwners.set(ownerKey, {
                        pluginName: plugin.definition.name,
                        path: ownerKey,
                    })
                }
            } else {
                // New property, track it
                propertyOwners.set(ownerKey, {
                    pluginName: plugin.definition.name,
                    path: ownerKey,
                })
            }
        }
    }
}

/**
 * Applies plugin extensions to a context with conflict detection
 */
export function applyPluginExtensions(
    plugins: LoadedPlugin[],
    context: PluginExtensionContext
): void {
    dbg(`applying extensions from ${plugins.length} plugins`)

    const propertyOwners = new Map<string, PropertyOwner>()

    for (const plugin of plugins) {
        dbg(
            `applying ${plugin.extensions.length} extensions from '${plugin.definition.name}' (priority: ${plugin.definition.priority || 0})`
        )
        for (const extension of plugin.extensions) {
            try {
                applyExtensionWithConflictDetection(
                    extension,
                    context,
                    plugin,
                    propertyOwners
                )
            } catch (error) {
                dbg(
                    `error applying extension from '${plugin.definition.name}': ${error.message}`
                )
                throw new Error(
                    `Error applying extension from plugin '${plugin.definition.name}': ${error.message}`
                )
            }
        }
    }
}

/**
 * Executes beforeRun lifecycle hooks
 */
export async function executeBeforeRunHooks(
    plugins: LoadedPlugin[],
    context: PluginLifecycleContext
): Promise<void> {
    dbg(`executing beforeRun hooks for ${plugins.length} plugins`)

    for (const plugin of plugins) {
        const hooks = plugin.lifecycleHooks.beforeRun || []
        for (const hook of hooks) {
            try {
                await hook(context)
                dbg(`beforeRun hook executed for '${plugin.definition.name}'`)
            } catch (error) {
                dbg(
                    `beforeRun hook failed for '${plugin.definition.name}': ${error.message}`
                )
                throw new Error(
                    `beforeRun hook failed for plugin '${plugin.definition.name}': ${error.message}`
                )
            }
        }
    }
}

/**
 * Executes afterRun lifecycle hooks
 */
export async function executeAfterRunHooks(
    plugins: LoadedPlugin[],
    context: PluginLifecycleContext
): Promise<void> {
    dbg(`executing afterRun hooks for ${plugins.length} plugins`)

    const errors: Array<{ plugin: string; error: Error }> = []

    for (const plugin of plugins) {
        const hooks = plugin.lifecycleHooks.afterRun || []
        for (const hook of hooks) {
            try {
                await hook(context)
                dbg(`afterRun hook executed for '${plugin.definition.name}'`)
            } catch (error) {
                dbg(
                    `afterRun hook failed for '${plugin.definition.name}': ${error.message}`
                )
                // Collect errors but don't stop execution
                errors.push({
                    plugin: plugin.definition.name,
                    error,
                })
            }
        }
    }

    // If there were errors, report them
    if (errors.length > 0) {
        const errorMessages = errors
            .map((e) => `  - ${e.plugin}: ${e.error.message}`)
            .join("\n")
        console.warn(
            `[Plugin Warning] Some afterRun hooks failed:\n${errorMessages}`
        )
    }
}

/**
 * Executes onError lifecycle hooks
 */
export async function executeErrorHooks(
    plugins: LoadedPlugin[],
    context: PluginErrorContext
): Promise<void> {
    dbg(`executing onError hooks for ${plugins.length} plugins`)

    const errors: Array<{ plugin: string; error: Error }> = []

    for (const plugin of plugins) {
        const hooks = plugin.lifecycleHooks.onError || []
        for (const hook of hooks) {
            try {
                await hook(context)
                dbg(`onError hook executed for '${plugin.definition.name}'`)
            } catch (error) {
                dbg(
                    `onError hook failed for '${plugin.definition.name}': ${error.message}`
                )
                // Collect errors but don't stop execution
                errors.push({
                    plugin: plugin.definition.name,
                    error,
                })
            }
        }
    }

    // If there were errors, report them
    if (errors.length > 0) {
        const errorMessages = errors
            .map((e) => `  - ${e.plugin}: ${e.error.message}`)
            .join("\n")
        console.warn(
            `[Plugin Warning] Some onError hooks failed:\n${errorMessages}`
        )
    }
}
