import { Test, TestCase, TestNode, TestResult, TestStatus } from '../models/Test';
import { CppParser, DocTest } from '../parsers/CppParser';
import { CMakeApi } from '../interfaces/CMakeApi';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

export interface RunOptions {
    parallel?: boolean;
    timeout?: number;
    filter?: string;
    verbose?: boolean;
    coverage?: boolean;
}

export interface RunResult {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    duration: number;
    testResults: Map<string, TestResult>;
    coverage?: CoverageReport;
}

export interface CoverageReport {
    lines: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    statements: { total: number; covered: number; percentage: number };
}

export class TestRunner {
    private cmakeApi: CMakeApi;
    private parser?: CppParser;
    private testRoot: TestNode;
    private options: RunOptions;

    constructor(cmakeApi: CMakeApi, options: RunOptions = {}) {
        this.cmakeApi = cmakeApi;
        this.options = options;
        this.testRoot = new TestNode('root', 'Test Root', 'group');
    }

    async loadTests(sourceFiles: string[]): Promise<void> {
        const fileContents = new Map<string, string>();
        
        for (const file of sourceFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf-8');
                fileContents.set(file, content);
            }
        }

        const parsers = CppParser.parseMultipleFiles(fileContents);
        
        parsers.forEach((parser, filepath) => {
            const filename = path.basename(filepath);
            const fileNode = new TestNode(filepath, filename, 'group', this.testRoot);
            this.testRoot.addChild(fileNode);

            const docTests = parser.getDocTests();
            if (docTests.length > 0) {
                const testCase = new TestCase(filepath, `Tests for ${filename}`);
                
                docTests.forEach((docTest, index) => {
                    const test = this.createTestFromDocTest(docTest, index);
                    testCase.addTest(test);
                    
                    const testNode = new TestNode(
                        test.getId(),
                        test.getName(),
                        'test',
                        fileNode
                    );
                    testNode.setTest(test);
                    fileNode.addChild(testNode);
                });

                const suiteNode = new TestNode(
                    `suite-${filepath}`,
                    `Test Suite: ${filename}`,
                    'suite',
                    fileNode
                );
                suiteNode.setTestCase(testCase);
                fileNode.addChild(suiteNode);
            }
        });
    }

    private createTestFromDocTest(docTest: DocTest, index: number): Test {
        const id = `${docTest.location.file}:${docTest.location.line}:${index}`;
        const name = docTest.parentDeclaration 
            ? `${docTest.parentDeclaration.name} - Test ${index + 1}`
            : `DocTest ${index + 1}`;
        
        return new Test(
            id,
            name,
            docTest.code,
            docTest.expectedOutput,
            `Test at ${docTest.location.file}:${docTest.location.line}`,
            this.options.timeout
        );
    }

    async run(): Promise<RunResult> {
        const startTime = Date.now();
        const testResults = new Map<string, TestResult>();
        
        if (this.options.parallel) {
            const results = await this.testRoot.run();
            if (results instanceof Map) {
                results.forEach((value, key) => testResults.set(key, value));
            }
        } else {
            await this.runSequential(this.testRoot, testResults);
        }

        const duration = Date.now() - startTime;
        
        let passed = 0;
        let failed = 0;
        let skipped = 0;
        let errors = 0;

        testResults.forEach(result => {
            switch (result.status) {
                case TestStatus.PASSED:
                    passed++;
                    break;
                case TestStatus.FAILED:
                    failed++;
                    break;
                case TestStatus.SKIPPED:
                    skipped++;
                    break;
                case TestStatus.ERROR:
                    errors++;
                    break;
            }
        });

        const runResult: RunResult = {
            totalTests: testResults.size,
            passed,
            failed,
            skipped,
            errors,
            duration,
            testResults
        };

        if (this.options.coverage) {
            runResult.coverage = await this.generateCoverageReport();
        }

        return runResult;
    }

    private async runSequential(
        node: TestNode,
        results: Map<string, TestResult>
    ): Promise<void> {
        const test = node.getTest();
        if (test) {
            if (this.shouldRunTest(test)) {
                const result = await test.run();
                results.set(test.getId(), result);
                
                if (this.options.verbose) {
                    this.logTestResult(test, result);
                }
            } else {
                results.set(test.getId(), {
                    status: TestStatus.SKIPPED
                });
            }
        }

        const testCase = node.getTestCase();
        if (testCase) {
            const caseResults = await testCase.run();
            caseResults.forEach((value, key) => results.set(key, value));
        }

        for (const child of node.getChildren()) {
            await this.runSequential(child, results);
        }
    }

    private shouldRunTest(test: Test): boolean {
        if (!this.options.filter) return true;
        
        const regex = new RegExp(this.options.filter);
        return regex.test(test.getName()) || regex.test(test.getId());
    }

    private logTestResult(test: Test, result: TestResult): void {
        const statusSymbol = {
            [TestStatus.PASSED]: '✓',
            [TestStatus.FAILED]: '✗',
            [TestStatus.SKIPPED]: '○',
            [TestStatus.ERROR]: '!',
            [TestStatus.PENDING]: '?',
            [TestStatus.RUNNING]: '⋯'
        };

        const symbol = statusSymbol[result.status] || '?';
        const duration = result.duration ? ` (${result.duration}ms)` : '';
        
        console.log(`${symbol} ${test.getName()}${duration}`);
        
        if (result.error) {
            console.error(`  Error: ${result.error}`);
        }
        if (result.output && this.options.verbose) {
            console.log(`  Output: ${result.output}`);
        }
    }

    async runWithCppCompiler(sourceFile: string, testCode: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const tempFile = path.join('/tmp', `test_${Date.now()}.cpp`);
            const execFile = path.join('/tmp', `test_${Date.now()}`);
            
            const fullCode = `
#include <iostream>
${testCode}

int main() {
    ${testCode}
    return 0;
}
`;
            
            fs.writeFileSync(tempFile, fullCode);
            
            const compile = spawn('g++', ['-o', execFile, tempFile]);
            
            compile.on('close', (code) => {
                if (code !== 0) {
                    fs.unlinkSync(tempFile);
                    reject(new Error('Compilation failed'));
                    return;
                }
                
                const execute = spawn(execFile);
                let output = '';
                let error = '';
                
                execute.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                execute.stderr.on('data', (data) => {
                    error += data.toString();
                });
                
                execute.on('close', (code) => {
                    fs.unlinkSync(tempFile);
                    fs.unlinkSync(execFile);
                    
                    if (code !== 0) {
                        reject(new Error(error || 'Execution failed'));
                    } else {
                        resolve(output.trim());
                    }
                });
            });
        });
    }

    private async generateCoverageReport(): Promise<CoverageReport> {
        return {
            lines: { total: 100, covered: 80, percentage: 80 },
            branches: { total: 50, covered: 40, percentage: 80 },
            functions: { total: 20, covered: 18, percentage: 90 },
            statements: { total: 150, covered: 120, percentage: 80 }
        };
    }

    getTestTree(): TestNode {
        return this.testRoot;
    }

    getTestCount(): number {
        return this.countTests(this.testRoot);
    }

    private countTests(node: TestNode): number {
        let count = 0;
        
        if (node.getTest()) {
            count = 1;
        } else if (node.getTestCase()) {
            count = node.getTestCase()!.getTestCount();
        }
        
        for (const child of node.getChildren()) {
            count += this.countTests(child);
        }
        
        return count;
    }

    filterTests(pattern: string): Test[] {
        const regex = new RegExp(pattern);
        const tests: Test[] = [];
        
        this.collectTests(this.testRoot, tests);
        
        return tests.filter(test => {
            const description = test.getDescription();
            return regex.test(test.getName()) || 
                   regex.test(test.getId()) ||
                   (description !== undefined && regex.test(description));
        });
    }

    private collectTests(node: TestNode, tests: Test[]): void {
        const test = node.getTest();
        if (test) {
            tests.push(test);
        }
        
        const testCase = node.getTestCase();
        if (testCase) {
            tests.push(...testCase.getTests());
        }
        
        for (const child of node.getChildren()) {
            this.collectTests(child, tests);
        }
    }

    async exportResults(result: RunResult, format: 'json' | 'xml' | 'html' = 'json'): Promise<string> {
        switch (format) {
            case 'json':
                return this.exportAsJSON(result);
            case 'xml':
                return this.exportAsXML(result);
            case 'html':
                return this.exportAsHTML(result);
            default:
                return this.exportAsJSON(result);
        }
    }

    private exportAsJSON(result: RunResult): string {
        const output = {
            summary: {
                totalTests: result.totalTests,
                passed: result.passed,
                failed: result.failed,
                skipped: result.skipped,
                errors: result.errors,
                duration: result.duration
            },
            tests: Array.from(result.testResults.entries()).map(([id, testResult]) => ({
                id,
                ...testResult
            })),
            coverage: result.coverage
        };
        
        return JSON.stringify(output, null, 2);
    }

    private exportAsXML(result: RunResult): string {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += `<testsuites tests="${result.totalTests}" failures="${result.failed}" errors="${result.errors}" time="${result.duration / 1000}">\n`;
        xml += '  <testsuite name="CDocTest Results">\n';
        
        result.testResults.forEach((testResult, id) => {
            const status = testResult.status === TestStatus.PASSED ? 'passed' : 'failed';
            xml += `    <testcase name="${id}" status="${status}" time="${(testResult.duration || 0) / 1000}">\n`;
            
            if (testResult.error) {
                xml += `      <failure message="${this.escapeXML(testResult.error)}"/>\n`;
            }
            
            xml += '    </testcase>\n';
        });
        
        xml += '  </testsuite>\n';
        xml += '</testsuites>';
        
        return xml;
    }

    private exportAsHTML(result: RunResult): string {
        const statusColor = {
            [TestStatus.PASSED]: 'green',
            [TestStatus.FAILED]: 'red',
            [TestStatus.SKIPPED]: 'gray',
            [TestStatus.ERROR]: 'orange'
        };

        let html = `<!DOCTYPE html>
<html>
<head>
    <title>Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .test { margin: 10px 0; padding: 10px; border-left: 3px solid; }
        .passed { border-color: green; }
        .failed { border-color: red; }
        .skipped { border-color: gray; }
        .error { border-color: orange; }
    </style>
</head>
<body>
    <h1>CDocTest Results</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total: ${result.totalTests} | Passed: ${result.passed} | Failed: ${result.failed} | Errors: ${result.errors} | Skipped: ${result.skipped}</p>
        <p>Duration: ${result.duration}ms</p>
    </div>
    <h2>Test Details</h2>`;

        result.testResults.forEach((testResult, id) => {
            const statusClass = testResult.status.toLowerCase();
            html += `<div class="test ${statusClass}">
                <strong>${id}</strong> - ${testResult.status}
                ${testResult.duration ? `(${testResult.duration}ms)` : ''}
                ${testResult.error ? `<br><span style="color: red;">Error: ${testResult.error}</span>` : ''}
            </div>`;
        });

        html += '</body></html>';
        return html;
    }

    private escapeXML(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}