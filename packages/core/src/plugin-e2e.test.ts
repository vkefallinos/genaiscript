import { describe, test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { globalPluginRegistry, Plugin } from "./plugin"
import { createPromptContext } from "./promptcontext"
import { MarkdownTrace } from "./trace"
import { TestHost } from "./testhost"
import { Project } from "./server/messages"

describe("plugin end-to-end workflow", async () => {
    beforeEach(() => {
        TestHost.install()
        globalPluginRegistry.clear()
    })

    afterEach(() => {
        globalPluginRegistry.clear()
    })

    test("complete plugin workflow with custom parser", async () => {
        // Create a custom parser plugin similar to the example
        const customParserPlugin: Plugin = {
            id: "test-custom-parser",
            name: "Test Custom Parser",
            description: "Adds custom parser for test format",
            version: "1.0.0",

            setup(extend) {
                extend({
                    parsers: {
                        TESTFORMAT(content: string) {
                            // Simple parser that splits content by lines and returns metadata
                            const lines = content.split("\n").filter((l) => l.trim())
                            return {
                                lineCount: lines.length,
                                lines: lines,
                                firstLine: lines[0] || "",
                                lastLine: lines[lines.length - 1] || "",
                            }
                        },
                    },
                })
            },
        }

        // Register the plugin
        globalPluginRegistry.register(customParserPlugin)

        // Create context (this will load plugins)
        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Verify the custom parser is available
        assert.ok((ctx.parsers as any).TESTFORMAT)

        // Use the custom parser
        const testContent = "line 1\nline 2\nline 3"
        const result = (ctx.parsers as any).TESTFORMAT(testContent)

        // Verify parser results
        assert.equal(result.lineCount, 3)
        assert.equal(result.lines.length, 3)
        assert.equal(result.firstLine, "line 1")
        assert.equal(result.lastLine, "line 3")

        // Verify existing parsers still work
        assert.equal(typeof ctx.parsers.JSON5, "function")
        const jsonResult = ctx.parsers.JSON5('{"test": true}')
        assert.deepEqual(jsonResult, { test: true })
    })

    test("complete plugin workflow with global utilities", async () => {
        // Create a global utilities plugin
        const utilsPlugin: Plugin = {
            id: "test-utils",
            name: "Test Utils Plugin",
            version: "1.0.0",

            setup(extend) {
                extend({
                    global: {
                        formatCurrency(amount: number) {
                            return `$${amount.toFixed(2)}`
                        },
                        validateEmail(email: string) {
                            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                        },
                    },
                })
            },
        }

        globalPluginRegistry.register(utilsPlugin)

        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Verify global utilities are available
        assert.equal(typeof (ctx as any).formatCurrency, "function")
        assert.equal((ctx as any).formatCurrency(1234.5), "$1234.50")

        assert.equal(typeof (ctx as any).validateEmail, "function")
        assert.equal((ctx as any).validateEmail("test@example.com"), true)
        assert.equal((ctx as any).validateEmail("invalid-email"), false)
    })

    test("complete plugin workflow with host capabilities", async () => {
        // Create a host capabilities plugin
        const hostPlugin: Plugin = {
            id: "test-host",
            name: "Test Host Plugin",
            version: "1.0.0",

            setup(extend) {
                extend({
                    host: {
                        mockApi() {
                            return {
                                async get(url: string) {
                                    return { status: 200, data: { url } }
                                },
                                async post(url: string, data: any) {
                                    return { status: 201, data: { url, data } }
                                },
                            }
                        },
                    },
                })
            },
        }

        globalPluginRegistry.register(hostPlugin)

        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Verify host capabilities are available
        assert.equal(typeof (ctx.host as any).mockApi, "function")

        const api = (ctx.host as any).mockApi()
        const getResult = await api.get("/test")
        assert.equal(getResult.status, 200)
        assert.equal(getResult.data.url, "/test")

        const postResult = await api.post("/test", { key: "value" })
        assert.equal(postResult.status, 201)
        assert.deepEqual(postResult.data.data, { key: "value" })

        // Verify existing host capabilities still work
        assert.ok(ctx.host.exec)
        assert.ok(ctx.host.fetch)
    })

    test("multiple plugins work together in workflow", async () => {
        // Create multiple plugins
        const plugin1: Plugin = {
            id: "workflow-parser",
            name: "Workflow Parser",
            setup(extend) {
                extend({
                    parsers: {
                        WORKFLOW(content: string) {
                            return { steps: content.split("\n").length }
                        },
                    },
                })
            },
        }

        const plugin2: Plugin = {
            id: "workflow-utils",
            name: "Workflow Utils",
            setup(extend) {
                extend({
                    global: {
                        processSteps(count: number) {
                            return `Processing ${count} steps`
                        },
                    },
                })
            },
        }

        const plugin3: Plugin = {
            id: "workflow-host",
            name: "Workflow Host",
            setup(extend) {
                extend({
                    host: {
                        logWorkflow(message: string) {
                            return { logged: message, timestamp: Date.now() }
                        },
                    },
                })
            },
        }

        globalPluginRegistry.registerAll([plugin1, plugin2, plugin3])

        const trace = new MarkdownTrace({})
        const project: Project = {
            projectFolder: "/test",
        } as Project

        const ev: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        const ctx = await createPromptContext(project, ev, trace, {}, "test-model")

        // Use all three plugins together
        const workflow = "step1\nstep2\nstep3"
        const parsed = (ctx.parsers as any).WORKFLOW(workflow)
        assert.equal(parsed.steps, 3)

        const processed = (ctx as any).processSteps(parsed.steps)
        assert.equal(processed, "Processing 3 steps")

        const logged = (ctx.host as any).logWorkflow(processed)
        assert.equal(logged.logged, "Processing 3 steps")
        assert.ok(logged.timestamp > 0)
    })

    test("plugins are loaded only once across multiple context creations", async () => {
        let setupCallCount = 0

        const plugin: Plugin = {
            id: "load-once-test",
            name: "Load Once Test",
            setup(extend) {
                setupCallCount++
                extend({
                    global: {
                        testValue: setupCallCount,
                    },
                })
            },
        }

        globalPluginRegistry.register(plugin)

        // Create first context
        const trace1 = new MarkdownTrace({})
        const project1: Project = { projectFolder: "/test" } as Project
        const ev1: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run-1",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        await createPromptContext(project1, ev1, trace1, {}, "test-model")
        assert.equal(setupCallCount, 1)

        // Create second context - plugin should not be loaded again
        const trace2 = new MarkdownTrace({})
        const project2: Project = { projectFolder: "/test" } as Project
        const ev2: ExpansionVariables = {
            dir: "/test",
            runDir: "/test/run",
            runId: "test-run-2",
            files: [],
            vars: {},
            secrets: {},
            generator: undefined,
            output: {},
        } as any

        await createPromptContext(project2, ev2, trace2, {}, "test-model")
        assert.equal(setupCallCount, 1, "Plugin setup should only be called once")
    })
})
