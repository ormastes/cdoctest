import { Test, TestCase, TestNode, TestStatus } from './models/Test';
import { CppParser, DocTest } from './parsers/CppParser';
import { CMakeApi } from './interfaces/CMakeApi';
import { TestRunner, RunOptions, RunResult } from './services/TestRunner';
import { CoverageReporter, CoverageThresholds } from './services/CoverageReporter';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export interface CDocTestConfig {
    sourceDir: string;
    buildDir?: string;
    includePaths?: string[];
    excludePatterns?: string[];
    coverageThresholds?: CoverageThresholds;
    timeout?: number;
    verbose?: boolean;
}

export interface TestFilter {
    pattern?: string;
    tags?: string[];
    files?: string[];
    functions?: string[];
}

export class CDocTest {
    private config: CDocTestConfig;
    private cmakeApi: CMakeApi;
    private testRunner: TestRunner;
    private coverageReporter: CoverageReporter;
    private parsers: Map<string, CppParser> = new Map();
    private tests: Map<string, Test> = new Map();
    private testCases: Map<string, TestCase> = new Map();
    private shellProcess?: any;

    constructor(config: CDocTestConfig) {
        this.config = {
            ...config,
            buildDir: config.buildDir || path.join(config.sourceDir, 'build'),
            timeout: config.timeout || 10000,
            verbose: config.verbose || false
        };

        this.cmakeApi = new CMakeApi(this.config.sourceDir, this.config.buildDir);
        this.coverageReporter = new CoverageReporter(this.config.coverageThresholds);
        this.testRunner = new TestRunner(this.cmakeApi, {
            timeout: this.config.timeout,
            verbose: this.config.verbose,
            coverage: true
        });
    }

    async initialize(): Promise<void> {
        await this.cmakeApi.loadProject(this.config.sourceDir, this.config.buildDir!);
        
        if (this.config.verbose) {
            console.log(`Initialized CDocTest for ${this.config.sourceDir}`);
        }
    }

    async load(files?: string[]): Promise<void> {
        const sourceFiles = files || this.discoverSourceFiles();
        
        for (const file of sourceFiles) {
            if (this.shouldProcessFile(file)) {
                await this.loadFile(file);
            }
        }

        await this.testRunner.loadTests(sourceFiles);
        
        if (this.config.verbose) {
            console.log(`Loaded ${this.tests.size} tests from ${sourceFiles.length} files`);
        }
    }

    private async loadFile(filepath: string): Promise<void> {
        if (!fs.existsSync(filepath)) {
            throw new Error(`File not found: ${filepath}`);
        }

        const content = fs.readFileSync(filepath, 'utf-8');
        const parser = new CppParser(filepath, content);
        parser.parse();
        
        this.parsers.set(filepath, parser);
        
        const docTests = parser.getDocTests();
        const testCase = new TestCase(filepath, `Tests for ${path.basename(filepath)}`);
        
        docTests.forEach((docTest, index) => {
            const test = this.createTest(docTest, filepath, index);
            this.tests.set(test.getId(), test);
            testCase.addTest(test);
        });
        
        if (testCase.getTestCount() > 0) {
            this.testCases.set(filepath, testCase);
        }
    }

    private createTest(docTest: DocTest, filepath: string, index: number): Test {
        const id = `${filepath}:${docTest.location.line}:${index}`;
        const name = docTest.parentDeclaration 
            ? `${docTest.parentDeclaration.name} - Test ${index + 1}`
            : `DocTest ${index + 1}`;
        
        return new Test(
            id,
            name,
            docTest.code,
            docTest.expectedOutput,
            `Test at ${filepath}:${docTest.location.line}`,
            this.config.timeout
        );
    }

    private discoverSourceFiles(): string[] {
        const files: string[] = [];
        const extensions = ['.cpp', '.cxx', '.cc', '.c', '.hpp', '.hxx', '.h'];
        
        const walkDir = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    if (!this.shouldExclude(fullPath)) {
                        walkDir(fullPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (extensions.includes(ext) && !this.shouldExclude(fullPath)) {
                        files.push(fullPath);
                    }
                }
            }
        };
        
        walkDir(this.config.sourceDir);
        return files;
    }

    private shouldProcessFile(filepath: string): boolean {
        return !this.shouldExclude(filepath);
    }

    private shouldExclude(filepath: string): boolean {
        if (!this.config.excludePatterns) return false;
        
        return this.config.excludePatterns.some(pattern => {
            const regex = new RegExp(pattern);
            return regex.test(filepath);
        });
    }

    async run(filter?: TestFilter): Promise<RunResult> {
        const options: RunOptions = {
            parallel: false,
            timeout: this.config.timeout,
            verbose: this.config.verbose,
            coverage: true,
            filter: filter?.pattern
        };

        if (filter?.files) {
            const filteredTests = Array.from(this.tests.values()).filter(test => {
                const testFile = test.getId().split(':')[0];
                return filter.files!.some(f => testFile.includes(f));
            });
            
            const tempRunner = new TestRunner(this.cmakeApi, options);
            await tempRunner.loadTests(filter.files);
            return await tempRunner.run();
        }

        const result = await this.testRunner.run();
        
        if (result.coverage) {
            this.updateCoverage(result);
        }
        
        return result;
    }

    private updateCoverage(result: RunResult): void {
        if (!result.coverage) return;
        
        this.parsers.forEach((parser, filepath) => {
            const lines = new Map<number, number>();
            const functions = new Map<string, { executed: boolean; hits: number }>();
            
            parser.getFunctionDeclarations().forEach(func => {
                const testsPassed = this.getTestsForFunction(func.name, filepath)
                    .filter(t => t.getStatus() === TestStatus.PASSED).length;
                
                functions.set(func.name, {
                    executed: testsPassed > 0,
                    hits: testsPassed
                });
            });
            
            this.coverageReporter.addFileCoverage(filepath, {
                path: filepath,
                lines,
                branches: new Map(),
                functions
            });
        });
    }

    private getTestsForFunction(functionName: string, filepath: string): Test[] {
        const parser = this.parsers.get(filepath);
        if (!parser) return [];
        
        const declaration = parser.findDeclaration(functionName);
        if (!declaration) return [];
        
        const docTests = parser.getDocTestsForDeclaration(declaration);
        return docTests.map((dt, index) => {
            const id = `${filepath}:${dt.location.line}:${index}`;
            return this.tests.get(id);
        }).filter(t => t !== undefined) as Test[];
    }

    async runVerify(): Promise<boolean> {
        const result = await this.run();
        const coverageCheck = this.coverageReporter.checkThresholds();
        
        if (this.config.verbose) {
            console.log('\n' + this.coverageReporter.generateTextReport());
        }
        
        return result.failed === 0 && result.errors === 0 && coverageCheck.passed;
    }

    filterTests(filter: TestFilter): Test[] {
        let filtered = Array.from(this.tests.values());
        
        if (filter.pattern) {
            const regex = new RegExp(filter.pattern);
            filtered = filtered.filter(test => {
                const description = test.getDescription();
                return regex.test(test.getName()) || 
                       regex.test(test.getId()) ||
                       (description !== undefined && regex.test(description));
            });
        }
        
        if (filter.files) {
            filtered = filtered.filter(test => {
                const testFile = test.getId().split(':')[0];
                return filter.files!.some(f => testFile.includes(f));
            });
        }
        
        if (filter.functions) {
            filtered = filtered.filter(test => {
                return filter.functions!.some(f => test.getName().includes(f));
            });
        }
        
        return filtered;
    }

    getTestNodes(): TestNode {
        return this.testRunner.getTestTree();
    }

    getTestCount(): number {
        return this.tests.size;
    }

    getTestCaseCount(): number {
        return this.testCases.size;
    }

    async getShell(): Promise<any> {
        if (!this.shellProcess) {
            this.shellProcess = await this.startClangRepl();
        }
        return this.shellProcess;
    }

    private async startClangRepl(): Promise<any> {
        return new Promise((resolve, reject) => {
            const clangRepl = spawn('clang-repl', [], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            clangRepl.on('error', (error) => {
                reject(new Error(`Failed to start clang-repl: ${error.message}`));
            });

            clangRepl.stdout.once('data', () => {
                resolve(clangRepl);
            });

            setTimeout(() => {
                if (clangRepl.exitCode === null) {
                    resolve(clangRepl);
                }
            }, 1000);
        });
    }

    async include(headers: string[]): Promise<void> {
        const shell = await this.getShell();
        
        for (const header of headers) {
            const includeCmd = `#include <${header}>\n`;
            shell.stdin.write(includeCmd);
        }
    }

    parse(code: string): any {
        const parser = new CppParser('inline', code);
        parser.parse();
        return parser.toJSON();
    }

    async exportResults(result: RunResult, format: 'json' | 'xml' | 'html' = 'json'): Promise<string> {
        return await this.testRunner.exportResults(result, format);
    }

    async exportCoverage(format: 'text' | 'html' | 'json' | 'lcov' = 'html'): Promise<string> {
        switch (format) {
            case 'text':
                return this.coverageReporter.generateTextReport();
            case 'html':
                return this.coverageReporter.generateHTMLReport();
            case 'json':
                return JSON.stringify(this.coverageReporter.getSummary(), null, 2);
            case 'lcov':
                const tempFile = path.join('/tmp', `coverage_${Date.now()}.lcov`);
                this.coverageReporter.exportToFile(tempFile, 'lcov');
                return fs.readFileSync(tempFile, 'utf-8');
        }
    }

    getCoverageReporter(): CoverageReporter {
        return this.coverageReporter;
    }

    getTestRunner(): TestRunner {
        return this.testRunner;
    }

    getCMakeApi(): CMakeApi {
        return this.cmakeApi;
    }

    getParsers(): Map<string, CppParser> {
        return this.parsers;
    }

    getTests(): Map<string, Test> {
        return this.tests;
    }

    getTestCases(): Map<string, TestCase> {
        return this.testCases;
    }

    reset(): void {
        this.parsers.clear();
        this.tests.clear();
        this.testCases.clear();
        this.coverageReporter.reset();
        
        if (this.shellProcess) {
            this.shellProcess.kill();
            this.shellProcess = undefined;
        }
    }

    async cleanup(): Promise<void> {
        this.reset();
        
        if (this.config.verbose) {
            console.log('CDocTest cleanup completed');
        }
    }
}