export enum TestStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    PASSED = 'passed',
    FAILED = 'failed',
    SKIPPED = 'skipped',
    ERROR = 'error'
}

export interface TestResult {
    status: TestStatus;
    output?: string;
    error?: string;
    duration?: number;
    assertions?: number;
}

export abstract class TestAbstract {
    protected id: string;
    protected name: string;
    protected description?: string;
    protected status: TestStatus;
    protected result?: TestResult;

    constructor(id: string, name: string, description?: string) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = TestStatus.PENDING;
    }

    abstract run(): Promise<TestResult>;

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getDescription(): string | undefined {
        return this.description;
    }

    getStatus(): TestStatus {
        return this.status;
    }

    getResult(): TestResult | undefined {
        return this.result;
    }

    setStatus(status: TestStatus): void {
        this.status = status;
    }
}

export class Test extends TestAbstract {
    private code: string;
    private expectedOutput?: string;
    private timeout: number;

    constructor(
        id: string,
        name: string,
        code: string,
        expectedOutput?: string,
        description?: string,
        timeout: number = 5000
    ) {
        super(id, name, description);
        this.code = code;
        this.expectedOutput = expectedOutput;
        this.timeout = timeout;
    }

    async run(): Promise<TestResult> {
        this.setStatus(TestStatus.RUNNING);
        const startTime = Date.now();

        try {
            const output = await this.executeCode();
            const duration = Date.now() - startTime;

            if (this.expectedOutput && output !== this.expectedOutput) {
                this.status = TestStatus.FAILED;
                this.result = {
                    status: TestStatus.FAILED,
                    output,
                    error: `Expected: ${this.expectedOutput}, Got: ${output}`,
                    duration
                };
            } else {
                this.status = TestStatus.PASSED;
                this.result = {
                    status: TestStatus.PASSED,
                    output,
                    duration
                };
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.status = TestStatus.ERROR;
            this.result = {
                status: TestStatus.ERROR,
                error: error instanceof Error ? error.message : String(error),
                duration
            };
        }

        return this.result;
    }

    private async executeCode(): Promise<string> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(`Executed: ${this.code}`);
            }, 100);
        });
    }

    getCode(): string {
        return this.code;
    }

    getExpectedOutput(): string | undefined {
        return this.expectedOutput;
    }
}

export class TestCase {
    private id: string;
    private name: string;
    private tests: Test[];
    private description?: string;

    constructor(id: string, name: string, description?: string) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.tests = [];
    }

    addTest(test: Test): void {
        this.tests.push(test);
    }

    removeTest(testId: string): boolean {
        const index = this.tests.findIndex(t => t.getId() === testId);
        if (index !== -1) {
            this.tests.splice(index, 1);
            return true;
        }
        return false;
    }

    getTests(): Test[] {
        return this.tests;
    }

    async run(): Promise<Map<string, TestResult>> {
        const results = new Map<string, TestResult>();
        
        for (const test of this.tests) {
            const result = await test.run();
            results.set(test.getId(), result);
        }
        
        return results;
    }

    async runParallel(): Promise<Map<string, TestResult>> {
        const results = new Map<string, TestResult>();
        const promises = this.tests.map(async test => {
            const result = await test.run();
            return { id: test.getId(), result };
        });
        
        const testResults = await Promise.all(promises);
        testResults.forEach(({ id, result }) => {
            results.set(id, result);
        });
        
        return results;
    }

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getDescription(): string | undefined {
        return this.description;
    }

    getTestCount(): number {
        return this.tests.length;
    }

    getPassedCount(): number {
        return this.tests.filter(t => t.getStatus() === TestStatus.PASSED).length;
    }

    getFailedCount(): number {
        return this.tests.filter(t => t.getStatus() === TestStatus.FAILED).length;
    }

    getErrorCount(): number {
        return this.tests.filter(t => t.getStatus() === TestStatus.ERROR).length;
    }
}

export class TestNode {
    private id: string;
    private name: string;
    private type: 'test' | 'suite' | 'group';
    private parent?: TestNode;
    private children: TestNode[];
    private test?: Test;
    private testCase?: TestCase;

    constructor(
        id: string,
        name: string,
        type: 'test' | 'suite' | 'group',
        parent?: TestNode
    ) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.parent = parent;
        this.children = [];
    }

    addChild(node: TestNode): void {
        this.children.push(node);
        node.parent = this;
    }

    removeChild(nodeId: string): boolean {
        const index = this.children.findIndex(n => n.id === nodeId);
        if (index !== -1) {
            this.children.splice(index, 1);
            return true;
        }
        return false;
    }

    getChildren(): TestNode[] {
        return this.children;
    }

    getParent(): TestNode | undefined {
        return this.parent;
    }

    setTest(test: Test): void {
        if (this.type === 'test') {
            this.test = test;
        }
    }

    setTestCase(testCase: TestCase): void {
        if (this.type === 'suite') {
            this.testCase = testCase;
        }
    }

    getTest(): Test | undefined {
        return this.test;
    }

    getTestCase(): TestCase | undefined {
        return this.testCase;
    }

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getType(): 'test' | 'suite' | 'group' {
        return this.type;
    }

    getPath(): string[] {
        const path: string[] = [this.name];
        let current = this.parent;
        
        while (current) {
            path.unshift(current.name);
            current = current.parent;
        }
        
        return path;
    }

    async run(): Promise<TestResult | Map<string, TestResult> | undefined> {
        if (this.test) {
            return await this.test.run();
        } else if (this.testCase) {
            return await this.testCase.run();
        } else if (this.children.length > 0) {
            const results = new Map<string, TestResult>();
            for (const child of this.children) {
                const childResult = await child.run();
                if (childResult instanceof Map) {
                    childResult.forEach((value, key) => results.set(key, value));
                } else if (childResult) {
                    results.set(child.getId(), childResult);
                }
            }
            return results;
        }
        return undefined;
    }
}