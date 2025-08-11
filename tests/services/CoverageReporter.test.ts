import { CoverageReporter, FileCoverage, CoverageThresholds } from '../../src/services/CoverageReporter';

describe('CoverageReporter', () => {
    let reporter: CoverageReporter;

    beforeEach(() => {
        reporter = new CoverageReporter({
            lines: 80,
            branches: 80,
            functions: 80,
            statements: 80
        });
    });

    describe('File Coverage', () => {
        it('should add file coverage data', () => {
            const fileCoverage: FileCoverage = {
                path: 'test.ts',
                lines: new Map([[1, 5], [2, 3], [3, 0], [4, 10]]),
                branches: new Map([['1_0_0', { taken: 1, total: 1 }]]),
                functions: new Map([['testFunc', { executed: true, hits: 5 }]])
            };

            reporter.addFileCoverage('test.ts', fileCoverage);
            
            const retrieved = reporter.getFileCoverage('test.ts');
            expect(retrieved).toBeDefined();
            expect(retrieved?.path).toBe('test.ts');
        });

        it('should calculate coverage summary correctly', () => {
            const fileCoverage: FileCoverage = {
                path: 'test.ts',
                lines: new Map([[1, 5], [2, 3], [3, 0], [4, 10]]),
                branches: new Map([
                    ['1_0_0', { taken: 1, total: 1 }],
                    ['2_0_0', { taken: 0, total: 1 }]
                ]),
                functions: new Map([
                    ['func1', { executed: true, hits: 5 }],
                    ['func2', { executed: false, hits: 0 }]
                ])
            };

            reporter.addFileCoverage('test.ts', fileCoverage);
            
            const summary = reporter.getSummary();
            
            expect(summary.lines.total).toBe(4);
            expect(summary.lines.covered).toBe(3);
            expect(summary.lines.percentage).toBe(75);
            
            expect(summary.branches.total).toBe(2);
            expect(summary.branches.covered).toBe(1);
            expect(summary.branches.percentage).toBe(50);
            
            expect(summary.functions.total).toBe(2);
            expect(summary.functions.covered).toBe(1);
            expect(summary.functions.percentage).toBe(50);
        });
    });

    describe('LCOV Processing', () => {
        it('should process LCOV data correctly', () => {
            const lcovData = `SF:test.ts
FN:10,testFunc
FNDA:5,testFunc
DA:1,5
DA:2,3
DA:3,0
DA:4,10
BRDA:1,0,0,1
BRDA:2,0,0,0
end_of_record`;

            reporter.processLcovData(lcovData);
            
            const summary = reporter.getSummary();
            expect(summary.lines.total).toBe(4);
            expect(summary.lines.covered).toBe(3);
            expect(summary.functions.total).toBe(1);
            expect(summary.functions.covered).toBe(1);
        });

        it('should handle multiple files in LCOV', () => {
            const lcovData = `SF:file1.ts
DA:1,1
DA:2,0
end_of_record
SF:file2.ts
DA:1,5
DA:2,3
end_of_record`;

            reporter.processLcovData(lcovData);
            
            const file1 = reporter.getFileCoverage('file1.ts');
            const file2 = reporter.getFileCoverage('file2.ts');
            
            expect(file1).toBeDefined();
            expect(file2).toBeDefined();
            
            const summary = reporter.getSummary();
            expect(summary.lines.total).toBe(4);
            expect(summary.lines.covered).toBe(3);
        });
    });

    describe('Threshold Checking', () => {
        it('should pass when coverage meets thresholds', () => {
            const fileCoverage: FileCoverage = {
                path: 'test.ts',
                lines: new Map(Array.from({length: 100}, (_, i) => [i + 1, i < 85 ? 1 : 0])),
                branches: new Map(Array.from({length: 100}, (_, i) => [`${i}_0_0`, { taken: i < 85 ? 1 : 0, total: 1 }])),
                functions: new Map(Array.from({length: 100}, (_, i) => [`func${i}`, { executed: i < 85, hits: i < 85 ? 1 : 0 }])),
            };

            reporter.addFileCoverage('test.ts', fileCoverage);
            
            const result = reporter.checkThresholds();
            expect(result.passed).toBe(true);
            expect(result.failures.length).toBe(0);
        });

        it('should fail when coverage below thresholds', () => {
            const fileCoverage: FileCoverage = {
                path: 'test.ts',
                lines: new Map(Array.from({length: 100}, (_, i) => [i + 1, i < 70 ? 1 : 0])),
                branches: new Map(Array.from({length: 100}, (_, i) => [`${i}_0_0`, { taken: i < 70 ? 1 : 0, total: 1 }])),
                functions: new Map(Array.from({length: 100}, (_, i) => [`func${i}`, { executed: i < 70, hits: i < 70 ? 1 : 0 }])),
            };

            reporter.addFileCoverage('test.ts', fileCoverage);
            
            const result = reporter.checkThresholds();
            expect(result.passed).toBe(false);
            expect(result.failures.length).toBeGreaterThan(0);
            expect(result.failures[0]).toContain('below threshold');
        });

        it('should use custom thresholds', () => {
            const customReporter = new CoverageReporter({
                lines: 90,
                branches: 95,
                functions: 85,
                statements: 90
            });

            const fileCoverage: FileCoverage = {
                path: 'test.ts',
                lines: new Map([[1, 1], [2, 1], [3, 1], [4, 0]]),
                branches: new Map(),
                functions: new Map()
            };

            customReporter.addFileCoverage('test.ts', fileCoverage);
            
            const result = customReporter.checkThresholds();
            expect(result.passed).toBe(false);
            expect(result.failures.some(f => f.includes('90%'))).toBe(true);
        });
    });

    describe('Report Generation', () => {
        beforeEach(() => {
            const fileCoverage: FileCoverage = {
                path: 'test.ts',
                lines: new Map([[1, 5], [2, 3], [3, 0], [4, 10]]),
                branches: new Map([['1_0_0', { taken: 1, total: 1 }]]),
                functions: new Map([['testFunc', { executed: true, hits: 5 }]])
            };
            reporter.addFileCoverage('test.ts', fileCoverage);
        });

        it('should generate text report', () => {
            const report = reporter.generateTextReport();
            
            expect(report).toContain('Coverage Summary');
            expect(report).toContain('Lines:');
            expect(report).toContain('Branches:');
            expect(report).toContain('Functions:');
            expect(report).toContain('test.ts');
        });

        it('should generate HTML report', () => {
            const report = reporter.generateHTMLReport();
            
            expect(report).toContain('<!DOCTYPE html>');
            expect(report).toContain('Coverage Report');
            expect(report).toContain('test.ts');
            expect(report).toContain('%');
        });

        it('should include threshold status in text report', () => {
            const report = reporter.generateTextReport();
            
            if (report.includes('✓')) {
                expect(report).toContain('All coverage thresholds met');
            } else {
                expect(report).toContain('Coverage Threshold Failures');
            }
        });
    });

    describe('Reset', () => {
        it('should reset all coverage data', () => {
            const fileCoverage: FileCoverage = {
                path: 'test.ts',
                lines: new Map([[1, 1]]),
                branches: new Map(),
                functions: new Map()
            };

            reporter.addFileCoverage('test.ts', fileCoverage);
            
            let summary = reporter.getSummary();
            expect(summary.lines.total).toBeGreaterThan(0);
            
            reporter.reset();
            
            summary = reporter.getSummary();
            expect(summary.lines.total).toBe(0);
            expect(reporter.getFileCoverage('test.ts')).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty coverage data', () => {
            const summary = reporter.getSummary();
            
            expect(summary.lines.total).toBe(0);
            expect(summary.lines.percentage).toBe(0);
            expect(summary.branches.percentage).toBe(0);
            expect(summary.functions.percentage).toBe(0);
        });

        it('should handle files with no executable lines', () => {
            const fileCoverage: FileCoverage = {
                path: 'empty.ts',
                lines: new Map(),
                branches: new Map(),
                functions: new Map()
            };

            reporter.addFileCoverage('empty.ts', fileCoverage);
            
            const summary = reporter.getSummary();
            expect(summary.lines.percentage).toBe(0);
        });

        it('should handle LCOV with missing values', () => {
            const lcovData = `SF:test.ts
DA:1,-
BRDA:1,0,0,-
end_of_record`;

            reporter.processLcovData(lcovData);
            
            const file = reporter.getFileCoverage('test.ts');
            expect(file).toBeDefined();
        });
    });
});