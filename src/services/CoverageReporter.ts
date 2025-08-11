import * as fs from 'fs';
import * as path from 'path';

export interface FileCoverage {
    path: string;
    lines: Map<number, number>;
    branches: Map<string, { taken: number; total: number }>;
    functions: Map<string, { executed: boolean; hits: number }>;
}

export interface CoverageData {
    files: Map<string, FileCoverage>;
    summary: CoverageSummary;
}

export interface CoverageSummary {
    lines: CoverageMetric;
    branches: CoverageMetric;
    functions: CoverageMetric;
    statements: CoverageMetric;
}

export interface CoverageMetric {
    total: number;
    covered: number;
    skipped: number;
    percentage: number;
}

export interface CoverageThresholds {
    lines?: number;
    branches?: number;
    functions?: number;
    statements?: number;
}

export class CoverageReporter {
    private coverageData: CoverageData;
    private thresholds: CoverageThresholds;

    constructor(thresholds: CoverageThresholds = {}) {
        this.thresholds = {
            lines: thresholds.lines || 80,
            branches: thresholds.branches || 80,
            functions: thresholds.functions || 80,
            statements: thresholds.statements || 80
        };
        
        this.coverageData = {
            files: new Map(),
            summary: this.createEmptySummary()
        };
    }

    private createEmptySummary(): CoverageSummary {
        return {
            lines: { total: 0, covered: 0, skipped: 0, percentage: 0 },
            branches: { total: 0, covered: 0, skipped: 0, percentage: 0 },
            functions: { total: 0, covered: 0, skipped: 0, percentage: 0 },
            statements: { total: 0, covered: 0, skipped: 0, percentage: 0 }
        };
    }

    addFileCoverage(filePath: string, coverage: FileCoverage): void {
        this.coverageData.files.set(filePath, coverage);
        this.updateSummary();
    }

    processLcovData(lcovContent: string): void {
        const lines = lcovContent.split('\n');
        let currentFile: FileCoverage | null = null;

        lines.forEach(line => {
            if (line.startsWith('SF:')) {
                const filePath = line.substring(3);
                currentFile = {
                    path: filePath,
                    lines: new Map(),
                    branches: new Map(),
                    functions: new Map()
                };
                this.coverageData.files.set(filePath, currentFile);
            } else if (currentFile) {
                if (line.startsWith('DA:')) {
                    const parts = line.substring(3).split(',');
                    const lineNum = parseInt(parts[0]);
                    const hits = parseInt(parts[1]);
                    currentFile.lines.set(lineNum, hits);
                } else if (line.startsWith('FN:')) {
                    const parts = line.substring(3).split(',');
                    const funcName = parts[1];
                    if (!currentFile.functions.has(funcName)) {
                        currentFile.functions.set(funcName, { executed: false, hits: 0 });
                    }
                } else if (line.startsWith('FNDA:')) {
                    const parts = line.substring(5).split(',');
                    const hits = parseInt(parts[0]);
                    const funcName = parts[1];
                    currentFile.functions.set(funcName, { 
                        executed: hits > 0, 
                        hits 
                    });
                } else if (line.startsWith('BRDA:')) {
                    const parts = line.substring(5).split(',');
                    const branchId = `${parts[0]}_${parts[1]}_${parts[2]}`;
                    const taken = parts[3] === '-' ? 0 : parseInt(parts[3]);
                    
                    if (!currentFile.branches.has(branchId)) {
                        currentFile.branches.set(branchId, { taken: 0, total: 1 });
                    }
                    const branch = currentFile.branches.get(branchId)!;
                    branch.taken = taken > 0 ? 1 : 0;
                }
            }
        });

        this.updateSummary();
    }

    private updateSummary(): void {
        const summary = this.createEmptySummary();

        this.coverageData.files.forEach(file => {
            file.lines.forEach(hits => {
                summary.lines.total++;
                if (hits > 0) summary.lines.covered++;
            });

            file.branches.forEach(branch => {
                summary.branches.total++;
                if (branch.taken > 0) summary.branches.covered++;
            });

            file.functions.forEach(func => {
                summary.functions.total++;
                if (func.executed) summary.functions.covered++;
            });
        });

        summary.statements = { ...summary.lines };

        summary.lines.percentage = this.calculatePercentage(summary.lines);
        summary.branches.percentage = this.calculatePercentage(summary.branches);
        summary.functions.percentage = this.calculatePercentage(summary.functions);
        summary.statements.percentage = this.calculatePercentage(summary.statements);

        this.coverageData.summary = summary;
    }

    private calculatePercentage(metric: CoverageMetric): number {
        if (metric.total === 0) return 0;
        return Math.round((metric.covered / metric.total) * 100 * 100) / 100;
    }

    getSummary(): CoverageSummary {
        return this.coverageData.summary;
    }

    getFileCoverage(filePath: string): FileCoverage | undefined {
        return this.coverageData.files.get(filePath);
    }

    checkThresholds(): { passed: boolean; failures: string[] } {
        const failures: string[] = [];
        const summary = this.coverageData.summary;

        if (this.thresholds.lines && summary.lines.percentage < this.thresholds.lines) {
            failures.push(`Line coverage ${summary.lines.percentage}% is below threshold ${this.thresholds.lines}%`);
        }

        if (this.thresholds.branches && summary.branches.percentage < this.thresholds.branches) {
            failures.push(`Branch coverage ${summary.branches.percentage}% is below threshold ${this.thresholds.branches}%`);
        }

        if (this.thresholds.functions && summary.functions.percentage < this.thresholds.functions) {
            failures.push(`Function coverage ${summary.functions.percentage}% is below threshold ${this.thresholds.functions}%`);
        }

        if (this.thresholds.statements && summary.statements.percentage < this.thresholds.statements) {
            failures.push(`Statement coverage ${summary.statements.percentage}% is below threshold ${this.thresholds.statements}%`);
        }

        return {
            passed: failures.length === 0,
            failures
        };
    }

    generateTextReport(): string {
        const summary = this.coverageData.summary;
        let report = '================== Coverage Summary ==================\n';
        report += `Lines:      ${summary.lines.covered}/${summary.lines.total} (${summary.lines.percentage}%)\n`;
        report += `Branches:   ${summary.branches.covered}/${summary.branches.total} (${summary.branches.percentage}%)\n`;
        report += `Functions:  ${summary.functions.covered}/${summary.functions.total} (${summary.functions.percentage}%)\n`;
        report += `Statements: ${summary.statements.covered}/${summary.statements.total} (${summary.statements.percentage}%)\n`;
        report += '======================================================\n\n';

        report += 'File Coverage:\n';
        this.coverageData.files.forEach((coverage, filePath) => {
            const linesCovered = Array.from(coverage.lines.values()).filter(h => h > 0).length;
            const linesTotal = coverage.lines.size;
            const percentage = linesTotal > 0 ? (linesCovered / linesTotal * 100).toFixed(2) : '100.00';
            
            report += `  ${filePath}: ${percentage}% (${linesCovered}/${linesTotal})\n`;
        });

        const thresholdCheck = this.checkThresholds();
        if (!thresholdCheck.passed) {
            report += '\n⚠️  Coverage Threshold Failures:\n';
            thresholdCheck.failures.forEach(failure => {
                report += `  ✗ ${failure}\n`;
            });
        } else {
            report += '\n✓ All coverage thresholds met!\n';
        }

        return report;
    }

    generateHTMLReport(): string {
        const summary = this.coverageData.summary;
        const thresholdCheck = this.checkThresholds();

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #fafafa;
        }
        .metric {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        .metric-label {
            color: #666;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
        }
        .good { color: #10b981; }
        .warning { color: #f59e0b; }
        .bad { color: #ef4444; }
        .files {
            padding: 30px;
        }
        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #e5e5e5;
        }
        .file-item:last-child {
            border-bottom: none;
        }
        .file-name {
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        .progress-bar {
            width: 200px;
            height: 20px;
            background: #e5e5e5;
            border-radius: 10px;
            overflow: hidden;
            margin: 0 20px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #34d399);
            transition: width 0.3s ease;
        }
        .percentage {
            font-weight: bold;
            min-width: 60px;
            text-align: right;
        }
        .threshold-status {
            margin: 20px 30px;
            padding: 15px;
            border-radius: 8px;
        }
        .threshold-passed {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #10b981;
        }
        .threshold-failed {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #ef4444;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Coverage Report</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-label">Lines</div>
                <div class="metric-value ${this.getColorClass(summary.lines.percentage)}">${summary.lines.percentage}%</div>
                <div style="color: #999; font-size: 14px;">${summary.lines.covered}/${summary.lines.total}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Branches</div>
                <div class="metric-value ${this.getColorClass(summary.branches.percentage)}">${summary.branches.percentage}%</div>
                <div style="color: #999; font-size: 14px;">${summary.branches.covered}/${summary.branches.total}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Functions</div>
                <div class="metric-value ${this.getColorClass(summary.functions.percentage)}">${summary.functions.percentage}%</div>
                <div style="color: #999; font-size: 14px;">${summary.functions.covered}/${summary.functions.total}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Statements</div>
                <div class="metric-value ${this.getColorClass(summary.statements.percentage)}">${summary.statements.percentage}%</div>
                <div style="color: #999; font-size: 14px;">${summary.statements.covered}/${summary.statements.total}</div>
            </div>
        </div>

        <div class="threshold-status ${thresholdCheck.passed ? 'threshold-passed' : 'threshold-failed'}">
            ${thresholdCheck.passed 
                ? '✓ All coverage thresholds met!' 
                : '⚠️ Coverage below thresholds:<br>' + thresholdCheck.failures.map(f => `• ${f}`).join('<br>')}
        </div>

        <div class="files">
            <h2>File Coverage</h2>`;

        this.coverageData.files.forEach((coverage, filePath) => {
            const linesCovered = Array.from(coverage.lines.values()).filter(h => h > 0).length;
            const linesTotal = coverage.lines.size;
            const percentage = linesTotal > 0 ? (linesCovered / linesTotal * 100) : 100;
            
            html += `
            <div class="file-item">
                <span class="file-name">${filePath}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="percentage ${this.getColorClass(percentage)}">${percentage.toFixed(1)}%</span>
            </div>`;
        });

        html += `
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    private getColorClass(percentage: number): string {
        if (percentage >= 80) return 'good';
        if (percentage >= 60) return 'warning';
        return 'bad';
    }

    exportToFile(filepath: string, format: 'text' | 'html' | 'json' | 'lcov' = 'text'): void {
        let content: string;
        
        switch (format) {
            case 'html':
                content = this.generateHTMLReport();
                break;
            case 'json':
                content = JSON.stringify({
                    summary: this.coverageData.summary,
                    files: Array.from(this.coverageData.files.entries()).map(([path, coverage]) => ({
                        path,
                        lines: Array.from(coverage.lines.entries()),
                        branches: Array.from(coverage.branches.entries()),
                        functions: Array.from(coverage.functions.entries())
                    }))
                }, null, 2);
                break;
            case 'lcov':
                content = this.generateLcovReport();
                break;
            default:
                content = this.generateTextReport();
        }
        
        fs.writeFileSync(filepath, content);
    }

    private generateLcovReport(): string {
        let lcov = '';
        
        this.coverageData.files.forEach((coverage, filePath) => {
            lcov += `SF:${filePath}\n`;
            
            coverage.functions.forEach((func, name) => {
                lcov += `FN:0,${name}\n`;
                lcov += `FNDA:${func.hits},${name}\n`;
            });
            
            coverage.lines.forEach((hits, lineNum) => {
                lcov += `DA:${lineNum},${hits}\n`;
            });
            
            coverage.branches.forEach((branch, id) => {
                const parts = id.split('_');
                lcov += `BRDA:${parts[0]},${parts[1]},${parts[2]},${branch.taken}\n`;
            });
            
            lcov += 'end_of_record\n';
        });
        
        return lcov;
    }

    reset(): void {
        this.coverageData = {
            files: new Map(),
            summary: this.createEmptySummary()
        };
    }
}