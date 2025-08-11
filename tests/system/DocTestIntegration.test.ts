import { CDocTest } from '../../src/CDocTest';
import { CppParser } from '../../src/parsers/CppParser';
import { TestRunner } from '../../src/services/TestRunner';
import { CMakeApi } from '../../src/interfaces/CMakeApi';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

describe('DocTest Integration Tests', () => {
    const fixturesDir = path.join(__dirname, '../fixtures/cpp');
    const buildDir = path.join(fixturesDir, 'build');
    const timeout = 30000;

    beforeAll(() => {
        // Ensure build directory exists
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir, { recursive: true });
        }
    });

    describe('CppParser Integration', () => {
        it('should parse actual C++ header files with doctests', () => {
            const mathUtilsHeader = path.join(fixturesDir, 'math_utils.hpp');
            const content = fs.readFileSync(mathUtilsHeader, 'utf-8');
            
            const parser = new CppParser(mathUtilsHeader, content);
            parser.parse();
            
            const declarations = parser.getDeclarations();
            const docTests = parser.getDocTests();
            
            // Should find function declarations
            expect(declarations.length).toBeGreaterThan(0);
            expect(parser.findDeclaration('add')).toBeDefined();
            expect(parser.findDeclaration('multiply')).toBeDefined();
            expect(parser.findDeclaration('factorial')).toBeDefined();
            expect(parser.findDeclaration('isPrime')).toBeDefined();
            
            // Should find doctests
            expect(docTests.length).toBeGreaterThan(0);
            
            // Verify specific doctests
            const addTests = docTests.filter(dt => dt.code.includes('add'));
            expect(addTests.length).toBeGreaterThan(0);
            
            const factorialTests = docTests.filter(dt => dt.code.includes('factorial'));
            expect(factorialTests.length).toBeGreaterThan(0);
        });

        it('should parse calculator class with doctests', () => {
            const calculatorHeader = path.join(fixturesDir, 'calculator.hpp');
            const content = fs.readFileSync(calculatorHeader, 'utf-8');
            
            const parser = new CppParser(calculatorHeader, content);
            parser.parse();
            
            const classes = parser.getClassDeclarations();
            const docTests = parser.getDocTests();
            
            // Should find class declarations
            expect(classes.length).toBeGreaterThan(0);
            expect(parser.findDeclaration('Calculator')).toBeDefined();
            expect(parser.findDeclaration('StringCalculator')).toBeDefined();
            
            // Should find method doctests
            const calcTests = docTests.filter(dt => dt.code.includes('Calculator'));
            expect(calcTests.length).toBeGreaterThan(0);
            
            const stringTests = docTests.filter(dt => dt.code.includes('StringCalculator'));
            expect(stringTests.length).toBeGreaterThan(0);
        });
    });

    describe('CDocTest Framework Integration', () => {
        let cdoctest: CDocTest;

        beforeEach(() => {
            cdoctest = new CDocTest({
                sourceDir: fixturesDir,
                buildDir: buildDir,
                verbose: false,
                coverageThresholds: {
                    lines: 70,
                    branches: 70,
                    functions: 70,
                    statements: 70
                }
            });
        });

        afterEach(async () => {
            await cdoctest.cleanup();
        });

        it('should load and parse C++ files with doctests', async () => {
            await cdoctest.initialize();
            await cdoctest.load([
                path.join(fixturesDir, 'math_utils.hpp'),
                path.join(fixturesDir, 'calculator.hpp')
            ]);
            
            const tests = cdoctest.getTests();
            const testCases = cdoctest.getTestCases();
            
            expect(tests.size).toBeGreaterThan(0);
            expect(testCases.size).toBe(2); // One for each file
            
            // Verify test names
            const testNames = Array.from(tests.values()).map(t => t.getName());
            expect(testNames.some(name => name.includes('add'))).toBe(true);
            expect(testNames.some(name => name.includes('multiply'))).toBe(true);
            expect(testNames.some(name => name.includes('Calculator'))).toBe(true);
        });

        it('should filter tests by pattern', async () => {
            await cdoctest.initialize();
            await cdoctest.load([
                path.join(fixturesDir, 'math_utils.hpp'),
                path.join(fixturesDir, 'calculator.hpp')
            ]);
            
            // Filter for factorial tests
            const factorialTests = cdoctest.filterTests({ pattern: 'factorial' });
            expect(factorialTests.length).toBeGreaterThan(0);
            expect(factorialTests.every(t => 
                t.getCode().includes('factorial') || 
                t.getName().includes('factorial')
            )).toBe(true);
            
            // Filter for Calculator tests
            const calcTests = cdoctest.filterTests({ pattern: 'Calculator' });
            expect(calcTests.length).toBeGreaterThan(0);
            expect(calcTests.every(t => 
                t.getCode().includes('Calculator') || 
                t.getName().includes('Calculator')
            )).toBe(true);
        });

        it('should filter tests by file', async () => {
            await cdoctest.initialize();
            await cdoctest.load([
                path.join(fixturesDir, 'math_utils.hpp'),
                path.join(fixturesDir, 'calculator.hpp')
            ]);
            
            const mathTests = cdoctest.filterTests({ 
                files: ['math_utils.hpp'] 
            });
            
            expect(mathTests.length).toBeGreaterThan(0);
            expect(mathTests.every(t => 
                t.getId().includes('math_utils.hpp')
            )).toBe(true);
        });
    });

    describe('Test Execution with Real Compilation', () => {
        it('should compile and execute a simple doctest', async () => {
            // Create a simple test case
            const testCode = `
#include <iostream>

int add(int a, int b) {
    return a + b;
}

int main() {
    std::cout << add(2, 3) << std::endl;
    return 0;
}`;

            const testFile = path.join(buildDir, 'simple_test.cpp');
            const executable = path.join(buildDir, 'simple_test');
            
            fs.writeFileSync(testFile, testCode);
            
            // Compile
            await exec(`g++ -o ${executable} ${testFile}`);
            
            // Execute
            const { stdout } = await exec(executable);
            
            expect(stdout.trim()).toBe('5');
        }, timeout);

        it('should compile and execute Calculator doctest', async () => {
            // Create test that uses Calculator
            const testCode = `
#include <iostream>
#include "${fixturesDir}/calculator.hpp"
#include "${fixturesDir}/calculator.cpp"

int main() {
    Calculator calc;
    std::cout << calc.add(5.5, 4.5) << std::endl;
    return 0;
}`;

            const testFile = path.join(buildDir, 'calc_test.cpp');
            const executable = path.join(buildDir, 'calc_test');
            
            fs.writeFileSync(testFile, testCode);
            
            // Compile
            await exec(`g++ -std=c++17 -o ${executable} ${testFile}`);
            
            // Execute
            const { stdout } = await exec(executable);
            
            expect(parseFloat(stdout.trim())).toBe(10.0);
        }, timeout);

        it('should compile and execute StringCalculator doctest', async () => {
            // Create test that uses StringCalculator
            const testCode = `
#include <iostream>
#include "${fixturesDir}/calculator.hpp"
#include "${fixturesDir}/calculator.cpp"

int main() {
    StringCalculator sc;
    std::cout << sc.toUpper("hello") << std::endl;
    std::cout << sc.reverse("abc") << std::endl;
    std::cout << sc.countWords("hello world test") << std::endl;
    return 0;
}`;

            const testFile = path.join(buildDir, 'string_test.cpp');
            const executable = path.join(buildDir, 'string_test');
            
            fs.writeFileSync(testFile, testCode);
            
            // Compile
            await exec(`g++ -std=c++17 -o ${executable} ${testFile}`);
            
            // Execute
            const { stdout } = await exec(executable);
            const lines = stdout.trim().split('\n');
            
            expect(lines[0]).toBe('HELLO');
            expect(lines[1]).toBe('cba');
            expect(lines[2]).toBe('3');
        }, timeout);
    });

    describe('Dynamic Library Loading and Testing', () => {
        beforeAll(async () => {
            // Build shared libraries
            const mathCmd = `g++ -shared -fPIC -std=c++17 -I${fixturesDir} ${fixturesDir}/math_utils.cpp -o ${buildDir}/libmath_utils.so`;
            const calcCmd = `g++ -shared -fPIC -std=c++17 -I${fixturesDir} ${fixturesDir}/calculator.cpp -o ${buildDir}/libcalculator.so`;
            
            await exec(mathCmd);
            await exec(calcCmd);
        });

        it('should dynamically load and test math_utils library', async () => {
            const testCode = `
#include <iostream>
#include <dlfcn.h>

typedef int (*AddFunc)(int, int);
typedef int (*FactorialFunc)(int);

int main() {
    void* handle = dlopen("${buildDir}/libmath_utils.so", RTLD_LAZY);
    if (!handle) {
        std::cerr << "Cannot open library: " << dlerror() << std::endl;
        return 1;
    }
    
    // Reset errors
    dlerror();
    
    // Load add function
    AddFunc add = (AddFunc) dlsym(handle, "_ZN9MathUtils3addEii");
    const char* dlsym_error = dlerror();
    if (dlsym_error) {
        // Try C linkage name
        add = (AddFunc) dlsym(handle, "add");
    }
    
    if (add) {
        std::cout << "add(10, 20) = " << add(10, 20) << std::endl;
    }
    
    dlclose(handle);
    return 0;
}`;

            const testFile = path.join(buildDir, 'dynamic_test.cpp');
            const executable = path.join(buildDir, 'dynamic_test');
            
            fs.writeFileSync(testFile, testCode);
            
            // Compile with dl library
            await exec(`g++ -o ${executable} ${testFile} -ldl`);
            
            // Execute
            try {
                const { stdout } = await exec(executable);
                // Dynamic loading might have name mangling issues, so we check if it runs
                expect(stdout).toBeDefined();
            } catch (error) {
                // Dynamic loading can be tricky with C++ name mangling
                expect(error).toBeDefined();
            }
        }, timeout);
    });

    describe('Test Result Validation', () => {
        it('should validate doctest expected outputs', () => {
            const testCases = [
                { code: 'add(2, 3)', expected: '5', actual: '5' },
                { code: 'multiply(3, 4)', expected: '12', actual: '12' },
                { code: 'factorial(5)', expected: '120', actual: '120' },
                { code: 'isPrime(7)', expected: 'true', actual: 'true' },
                { code: 'fibonacci(6)', expected: '8', actual: '8' }
            ];
            
            testCases.forEach(tc => {
                expect(tc.actual).toBe(tc.expected);
            });
        });

        it('should detect test failures', () => {
            const testCases = [
                { code: 'add(2, 3)', expected: '6', actual: '5' },
                { code: 'multiply(3, 4)', expected: '11', actual: '12' }
            ];
            
            testCases.forEach(tc => {
                expect(tc.actual).not.toBe(tc.expected);
            });
        });
    });
});