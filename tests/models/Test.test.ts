import { Test, TestCase, TestNode, TestStatus, TestResult } from '../../src/models/Test';

describe('Test Model', () => {
    describe('Test', () => {
        let test: Test;

        beforeEach(() => {
            test = new Test(
                'test-1',
                'Sample Test',
                'console.log("Hello");',
                'Hello',
                'A sample test'
            );
        });

        it('should create a test with correct properties', () => {
            expect(test.getId()).toBe('test-1');
            expect(test.getName()).toBe('Sample Test');
            expect(test.getDescription()).toBe('A sample test');
            expect(test.getStatus()).toBe(TestStatus.PENDING);
            expect(test.getCode()).toBe('console.log("Hello");');
            expect(test.getExpectedOutput()).toBe('Hello');
        });

        it('should run test and update status', async () => {
            const result = await test.run();
            
            expect(test.getStatus()).not.toBe(TestStatus.PENDING);
            expect(result).toBeDefined();
            expect(result.duration).toBeGreaterThan(0);
        });

        it('should set and get status', () => {
            test.setStatus(TestStatus.RUNNING);
            expect(test.getStatus()).toBe(TestStatus.RUNNING);
        });
    });

    describe('TestCase', () => {
        let testCase: TestCase;
        let test1: Test;
        let test2: Test;

        beforeEach(() => {
            testCase = new TestCase('case-1', 'Test Suite', 'A test suite');
            test1 = new Test('test-1', 'Test 1', 'code1');
            test2 = new Test('test-2', 'Test 2', 'code2');
        });

        it('should create a test case with correct properties', () => {
            expect(testCase.getId()).toBe('case-1');
            expect(testCase.getName()).toBe('Test Suite');
            expect(testCase.getDescription()).toBe('A test suite');
            expect(testCase.getTestCount()).toBe(0);
        });

        it('should add and remove tests', () => {
            testCase.addTest(test1);
            testCase.addTest(test2);
            
            expect(testCase.getTestCount()).toBe(2);
            expect(testCase.getTests()).toContain(test1);
            expect(testCase.getTests()).toContain(test2);
            
            const removed = testCase.removeTest('test-1');
            expect(removed).toBe(true);
            expect(testCase.getTestCount()).toBe(1);
            expect(testCase.getTests()).not.toContain(test1);
        });

        it('should run tests sequentially', async () => {
            testCase.addTest(test1);
            testCase.addTest(test2);
            
            const results = await testCase.run();
            
            expect(results.size).toBe(2);
            expect(results.has('test-1')).toBe(true);
            expect(results.has('test-2')).toBe(true);
        });

        it('should run tests in parallel', async () => {
            testCase.addTest(test1);
            testCase.addTest(test2);
            
            const results = await testCase.runParallel();
            
            expect(results.size).toBe(2);
            expect(results.has('test-1')).toBe(true);
            expect(results.has('test-2')).toBe(true);
        });

        it('should count test statuses correctly', async () => {
            testCase.addTest(test1);
            testCase.addTest(test2);
            
            await testCase.run();
            
            const passedCount = testCase.getPassedCount();
            const failedCount = testCase.getFailedCount();
            const errorCount = testCase.getErrorCount();
            
            expect(passedCount + failedCount + errorCount).toBeLessThanOrEqual(2);
        });
    });

    describe('TestNode', () => {
        let rootNode: TestNode;
        let childNode: TestNode;
        let test: Test;

        beforeEach(() => {
            rootNode = new TestNode('root', 'Root', 'group');
            childNode = new TestNode('child', 'Child', 'test');
            test = new Test('test-1', 'Test 1', 'code');
        });

        it('should create a test node with correct properties', () => {
            expect(rootNode.getId()).toBe('root');
            expect(rootNode.getName()).toBe('Root');
            expect(rootNode.getType()).toBe('group');
            expect(rootNode.getParent()).toBeUndefined();
        });

        it('should manage parent-child relationships', () => {
            rootNode.addChild(childNode);
            
            expect(rootNode.getChildren()).toContain(childNode);
            expect(childNode.getParent()).toBe(rootNode);
            
            const removed = rootNode.removeChild('child');
            expect(removed).toBe(true);
            expect(rootNode.getChildren()).not.toContain(childNode);
        });

        it('should set and get test', () => {
            childNode.setTest(test);
            expect(childNode.getTest()).toBe(test);
        });

        it('should calculate path correctly', () => {
            rootNode.addChild(childNode);
            const grandChild = new TestNode('grand', 'GrandChild', 'test');
            childNode.addChild(grandChild);
            
            const path = grandChild.getPath();
            expect(path).toEqual(['Root', 'Child', 'GrandChild']);
        });

        it('should run tests recursively', async () => {
            childNode.setTest(test);
            rootNode.addChild(childNode);
            
            const result = await rootNode.run();
            
            expect(result).toBeInstanceOf(Map);
            if (result instanceof Map) {
                expect(result.size).toBeGreaterThan(0);
            }
        });
    });
});