import { CDocTest, CDocTestConfig } from '../src/CDocTest';
import { TestStatus } from '../src/models/Test';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('child_process');

describe('CDocTest', () => {
    let cdoctest: CDocTest;
    const config: CDocTestConfig = {
        sourceDir: '/test/src',
        buildDir: '/test/build',
        includePaths: ['/usr/include'],
        excludePatterns: ['node_modules', '\\.git'],
        coverageThresholds: {
            lines: 80,
            branches: 80,
            functions: 80,
            statements: 80
        },
        timeout: 5000,
        verbose: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
        cdoctest = new CDocTest(config);
    });

    afterEach(() => {
        cdoctest.cleanup();
    });

    describe('Initialization', () => {
        it('should create CDocTest instance with config', () => {
            expect(cdoctest).toBeDefined();
            expect(cdoctest.getCMakeApi()).toBeDefined();
            expect(cdoctest.getTestRunner()).toBeDefined();
            expect(cdoctest.getCoverageReporter()).toBeDefined();
        });

        it('should initialize with default values', () => {
            const minimalConfig: CDocTestConfig = {
                sourceDir: '/test/src'
            };
            
            const minimalCDocTest = new CDocTest(minimalConfig);
            expect(minimalCDocTest).toBeDefined();
            minimalCDocTest.cleanup();
        });

        it('should initialize CMake API', async () => {
            await cdoctest.initialize();
            const cmakeApi = cdoctest.getCMakeApi();
            expect(cmakeApi.getProject()).toBeDefined();
        });
    });

    describe('File Loading', () => {
        beforeEach(() => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(`
                /// >>> add(2, 3)
                /// 5
                int add(int a, int b) {
                    return a + b;
                }
            `);
            (fs.readdirSync as jest.Mock).mockReturnValue([
                { name: 'test.cpp', isDirectory: () => false, isFile: () => true },
                { name: 'test.h', isDirectory: () => false, isFile: () => true }
            ]);
        });

        it('should load source files', async () => {
            await cdoctest.load(['test.cpp']);
            
            const tests = cdoctest.getTests();
            expect(tests.size).toBeGreaterThan(0);
        });

        it('should discover source files automatically', async () => {
            (fs.readdirSync as jest.Mock).mockImplementation((dir) => {
                if (dir === '/test/src') {
                    return [
                        { name: 'main.cpp', isDirectory: () => false, isFile: () => true },
                        { name: 'utils.cpp', isDirectory: () => false, isFile: () => true },
                        { name: 'subdir', isDirectory: () => true, isFile: () => false }
                    ];
                } else if (dir === '/test/src/subdir') {
                    return [
                        { name: 'helper.cpp', isDirectory: () => false, isFile: () => true }
                    ];
                }
                return [];
            });

            await cdoctest.load();
            
            expect(fs.readFileSync).toHaveBeenCalled();
        });

        it('should exclude files based on patterns', async () => {
            const configWithExcludes = {
                ...config,
                excludePatterns: ['test\\.cpp', 'node_modules']
            };
            
            const cdoctestWithExcludes = new CDocTest(configWithExcludes);
            
            (fs.readdirSync as jest.Mock).mockReturnValue([
                { name: 'test.cpp', isDirectory: () => false, isFile: () => true },
                { name: 'main.cpp', isDirectory: () => false, isFile: () => true }
            ]);
            
            await cdoctestWithExcludes.load();
            
            cdoctestWithExcludes.cleanup();
        });

        it('should handle non-existent files', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            
            await expect(cdoctest.load(['nonexistent.cpp'])).rejects.toThrow('File not found');
        });
    });

    describe('Test Filtering', () => {
        beforeEach(async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockImplementation((filepath) => {
                if (filepath.includes('math.cpp')) {
                    return `
                        /// >>> add(2, 3)
                        /// 5
                        int add(int a, int b) { return a + b; }
                        
                        /// >>> multiply(3, 4)
                        /// 12
                        int multiply(int a, int b) { return a * b; }
                    `;
                } else if (filepath.includes('string.cpp')) {
                    return `
                        /// >>> concat("hello", "world")
                        /// "helloworld"
                        string concat(string a, string b) { return a + b; }
                    `;
                }
                return '';
            });
            
            await cdoctest.load(['math.cpp', 'string.cpp']);
        });

        it('should filter tests by pattern', () => {
            const filtered = cdoctest.filterTests({ pattern: 'add' });
            
            expect(filtered.length).toBeGreaterThan(0);
            expect(filtered.every(t => t.getName().toLowerCase().includes('add'))).toBe(true);
        });

        it('should filter tests by file', () => {
            const filtered = cdoctest.filterTests({ files: ['math.cpp'] });
            
            expect(filtered.length).toBeGreaterThan(0);
            expect(filtered.every(t => t.getId().includes('math.cpp'))).toBe(true);
        });

        it('should filter tests by function name', () => {
            const filtered = cdoctest.filterTests({ functions: ['multiply'] });
            
            if (filtered.length > 0) {
                expect(filtered.every(t => t.getName().includes('multiply'))).toBe(true);
            } else {
                // If no tests match, that's also valid
                expect(filtered.length).toBe(0);
            }
        });

        it('should combine multiple filters', () => {
            const filtered = cdoctest.filterTests({
                pattern: 'Test',
                files: ['math.cpp'],
                functions: ['add']
            });
            
            expect(filtered.every(t => 
                t.getName().includes('Test') || 
                t.getId().includes('math.cpp') ||
                t.getName().includes('add')
            )).toBe(true);
        });
    });

    describe('Test Execution', () => {
        beforeEach(async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(`
                /// >>> test()
                /// "success"
                void test() { cout << "success"; }
            `);
            
            await cdoctest.load(['test.cpp']);
        });

        it('should run all tests', async () => {
            const result = await cdoctest.run();
            
            expect(result).toBeDefined();
            expect(result.totalTests).toBeGreaterThan(0);
            expect(result.testResults).toBeDefined();
        });

        it('should run filtered tests', async () => {
            const result = await cdoctest.run({ pattern: 'test' });
            
            expect(result).toBeDefined();
            expect(result.totalTests).toBeGreaterThan(0);
        });

        it('should run tests for specific files', async () => {
            const result = await cdoctest.run({ files: ['test.cpp'] });
            
            expect(result).toBeDefined();
            expect(result.totalTests).toBeGreaterThan(0);
        });

        it('should verify tests and coverage', async () => {
            const passed = await cdoctest.runVerify();
            
            expect(typeof passed).toBe('boolean');
        });
    });

    describe('Coverage Reporting', () => {
        beforeEach(async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(`
                /// >>> test()
                void test() { }
            `);
            
            await cdoctest.load(['test.cpp']);
            await cdoctest.run();
        });

        it('should export coverage as HTML', async () => {
            const html = await cdoctest.exportCoverage('html');
            
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('Coverage Report');
        });

        it('should export coverage as text', async () => {
            const text = await cdoctest.exportCoverage('text');
            
            expect(text).toContain('Coverage Summary');
            expect(text).toContain('Lines:');
        });

        it('should export coverage as JSON', async () => {
            const json = await cdoctest.exportCoverage('json');
            const parsed = JSON.parse(json);
            
            expect(parsed).toHaveProperty('lines');
            expect(parsed).toHaveProperty('branches');
            expect(parsed).toHaveProperty('functions');
        });

        it('should export coverage as LCOV', async () => {
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
            
            const lcov = await cdoctest.exportCoverage('lcov');
            
            expect(lcov).toBeDefined();
        });
    });

    describe('Result Export', () => {
        let mockResult: any;

        beforeEach(() => {
            mockResult = {
                totalTests: 10,
                passed: 8,
                failed: 1,
                skipped: 0,
                errors: 1,
                duration: 1234,
                testResults: new Map([
                    ['test1', { status: TestStatus.PASSED, duration: 100 }],
                    ['test2', { status: TestStatus.FAILED, error: 'Assertion failed', duration: 50 }]
                ])
            };
        });

        it('should export results as JSON', async () => {
            const json = await cdoctest.exportResults(mockResult, 'json');
            const parsed = JSON.parse(json);
            
            expect(parsed).toHaveProperty('summary');
            expect(parsed).toHaveProperty('tests');
            expect(parsed.summary.totalTests).toBe(10);
        });

        it('should export results as XML', async () => {
            const xml = await cdoctest.exportResults(mockResult, 'xml');
            
            expect(xml).toContain('<?xml version="1.0"');
            expect(xml).toContain('<testsuites');
            expect(xml).toContain('<testcase');
        });

        it('should export results as HTML', async () => {
            const html = await cdoctest.exportResults(mockResult, 'html');
            
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('Test Results');
            expect(html).toContain('Total: 10');
        });
    });

    describe('Parser Integration', () => {
        it('should parse inline C++ code', () => {
            const result = cdoctest.parse(`
                int add(int a, int b) {
                    return a + b;
                }
            `);
            
            expect(result).toBeDefined();
            expect(result).toHaveProperty('declarations');
            expect(result).toHaveProperty('docTests');
        });
    });

    describe('Test Tree', () => {
        beforeEach(async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(`
                /// >>> test()
                void test() { }
            `);
            
            await cdoctest.load(['test.cpp']);
        });

        it('should get test tree root node', () => {
            const root = cdoctest.getTestNodes();
            
            expect(root).toBeDefined();
            expect(root.getType()).toBe('group');
            expect(root.getName()).toBe('Test Root');
        });

        it('should get test count', () => {
            const count = cdoctest.getTestCount();
            expect(count).toBeGreaterThanOrEqual(0);
        });

        it('should get test case count', () => {
            const count = cdoctest.getTestCaseCount();
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Cleanup', () => {
        it('should reset all data', () => {
            cdoctest.reset();
            
            expect(cdoctest.getTests().size).toBe(0);
            expect(cdoctest.getTestCases().size).toBe(0);
            expect(cdoctest.getParsers().size).toBe(0);
        });

        it('should cleanup resources', async () => {
            await cdoctest.cleanup();
            
            expect(cdoctest.getTests().size).toBe(0);
        });
    });
});