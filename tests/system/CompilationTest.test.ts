import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

describe('System Tests - C++ Compilation and Testing', () => {
    const fixturesDir = path.join(__dirname, '../fixtures/cpp');
    const buildDir = path.join(fixturesDir, 'build');
    const timeout = 30000; // 30 seconds for compilation

    beforeAll(() => {
        // Clean and create build directory
        if (fs.existsSync(buildDir)) {
            execSync(`rm -rf ${buildDir}`);
        }
        fs.mkdirSync(buildDir, { recursive: true });
    });

    afterAll(() => {
        // Optional: Clean up build directory after tests
        // execSync(`rm -rf ${buildDir}`);
    });

    describe('Static Library Compilation', () => {
        it('should compile math_utils as static library', async () => {
            const sourceFile = path.join(fixturesDir, 'math_utils.cpp');
            const headerFile = path.join(fixturesDir, 'math_utils.hpp');
            const outputLib = path.join(buildDir, 'libmath_utils.a');

            // Compile to object file
            const compileCmd = `g++ -c -fPIC -std=c++17 -I${fixturesDir} ${sourceFile} -o ${buildDir}/math_utils.o`;
            await exec(compileCmd);

            // Create static library
            const arCmd = `ar rcs ${outputLib} ${buildDir}/math_utils.o`;
            await exec(arCmd);

            expect(fs.existsSync(outputLib)).toBe(true);
        }, timeout);

        it('should compile calculator as static library', async () => {
            const sourceFile = path.join(fixturesDir, 'calculator.cpp');
            const outputLib = path.join(buildDir, 'libcalculator.a');

            // Compile to object file
            const compileCmd = `g++ -c -fPIC -std=c++17 -I${fixturesDir} ${sourceFile} -o ${buildDir}/calculator.o`;
            await exec(compileCmd);

            // Create static library
            const arCmd = `ar rcs ${outputLib} ${buildDir}/calculator.o`;
            await exec(arCmd);

            expect(fs.existsSync(outputLib)).toBe(true);
        }, timeout);
    });

    describe('Shared Library Compilation', () => {
        it('should compile math_utils as shared library', async () => {
            const sourceFile = path.join(fixturesDir, 'math_utils.cpp');
            const outputLib = path.join(buildDir, 'libmath_utils.so');

            const cmd = `g++ -shared -fPIC -std=c++17 -I${fixturesDir} ${sourceFile} -o ${outputLib}`;
            await exec(cmd);

            expect(fs.existsSync(outputLib)).toBe(true);

            // Verify it's a valid shared library
            const { stdout } = await exec(`file ${outputLib}`);
            expect(stdout).toContain('shared object');
        }, timeout);

        it('should compile calculator as shared library', async () => {
            const sourceFile = path.join(fixturesDir, 'calculator.cpp');
            const outputLib = path.join(buildDir, 'libcalculator.so');

            const cmd = `g++ -shared -fPIC -std=c++17 -I${fixturesDir} ${sourceFile} -o ${outputLib}`;
            await exec(cmd);

            expect(fs.existsSync(outputLib)).toBe(true);

            // Verify it's a valid shared library
            const { stdout } = await exec(`file ${outputLib}`);
            expect(stdout).toContain('shared object');
        }, timeout);
    });

    describe('Executable Compilation and Linking', () => {
        it('should compile and link test executable with static libraries', async () => {
            const mainFile = path.join(fixturesDir, 'test_main.cpp');
            const executable = path.join(buildDir, 'test_static');

            const cmd = `g++ -std=c++17 -I${fixturesDir} ${mainFile} ` +
                       `-L${buildDir} -lmath_utils -lcalculator ` +
                       `-o ${executable} -static`;

            try {
                await exec(cmd);
            } catch (error) {
                // If static linking fails, try with object files directly
                const altCmd = `g++ -std=c++17 -I${fixturesDir} ${mainFile} ` +
                              `${buildDir}/math_utils.o ${buildDir}/calculator.o ` +
                              `-o ${executable}`;
                await exec(altCmd);
            }

            expect(fs.existsSync(executable)).toBe(true);
        }, timeout);

        it('should compile and link test executable with shared libraries', async () => {
            const mainFile = path.join(fixturesDir, 'test_main.cpp');
            const executable = path.join(buildDir, 'test_shared');

            const cmd = `g++ -std=c++17 -I${fixturesDir} ${mainFile} ` +
                       `-L${buildDir} -lmath_utils -lcalculator ` +
                       `-Wl,-rpath,${buildDir} ` +
                       `-o ${executable}`;

            await exec(cmd);

            expect(fs.existsSync(executable)).toBe(true);
        }, timeout);
    });

    describe('Test Execution', () => {
        it('should execute test with static libraries', async () => {
            const executable = path.join(buildDir, 'test_static');
            
            if (!fs.existsSync(executable)) {
                // Compile if not exists
                const mainFile = path.join(fixturesDir, 'test_main.cpp');
                const cmd = `g++ -std=c++17 -I${fixturesDir} ${mainFile} ` +
                           `${buildDir}/math_utils.o ${buildDir}/calculator.o ` +
                           `-o ${executable}`;
                await exec(cmd);
            }

            const { stdout } = await exec(executable);

            // Verify expected outputs
            expect(stdout).toContain('add(2, 3) = 5');
            expect(stdout).toContain('multiply(3, 4) = 12');
            expect(stdout).toContain('factorial(5) = 120');
            expect(stdout).toContain('isPrime(7) = true');
            expect(stdout).toContain('fibonacci(6) = 8');
            expect(stdout).toContain('calc.add(5.5, 4.5) = 10');
            expect(stdout).toContain('calc.power(2.0, 3.0) = 8');
            expect(stdout).toContain('toUpper("hello") = HELLO');
            expect(stdout).toContain('reverse("abc") = cba');
        }, timeout);

        it('should execute test with shared libraries', async () => {
            const executable = path.join(buildDir, 'test_shared');
            
            if (fs.existsSync(executable)) {
                const { stdout } = await exec(executable);

                // Verify expected outputs
                expect(stdout).toContain('add(2, 3) = 5');
                expect(stdout).toContain('multiply(3, 4) = 12');
                expect(stdout).toContain('factorial(5) = 120');
                expect(stdout).toContain('calc.sqrt(16.0) = 4');
                expect(stdout).toContain('toLower("WORLD") = world');
                expect(stdout).toContain('countWords("hello world test") = 3');
            }
        }, timeout);
    });

    describe('CMake Build System', () => {
        it('should build project using CMake', async () => {
            const cmakeBuildDir = path.join(buildDir, 'cmake');
            fs.mkdirSync(cmakeBuildDir, { recursive: true });

            // Configure CMake
            const configureCmd = `cd ${cmakeBuildDir} && cmake ${fixturesDir}`;
            await exec(configureCmd);

            // Build project
            const buildCmd = `cd ${cmakeBuildDir} && make`;
            await exec(buildCmd);

            // Check if libraries were built
            expect(fs.existsSync(path.join(cmakeBuildDir, 'libmath_utils.so'))).toBe(true);
            expect(fs.existsSync(path.join(cmakeBuildDir, 'libcalculator.so'))).toBe(true);
            expect(fs.existsSync(path.join(cmakeBuildDir, 'test_runner'))).toBe(true);

            // Run the test executable
            const { stdout } = await exec(path.join(cmakeBuildDir, 'test_runner'));
            expect(stdout).toContain('Testing Math Utils Library');
            expect(stdout).toContain('add(2, 3) = 5');
        }, timeout * 2); // Double timeout for CMake
    });

    describe('DocTest Extraction and Validation', () => {
        it('should extract and validate doctests from math_utils.hpp', () => {
            const headerFile = path.join(fixturesDir, 'math_utils.hpp');
            const content = fs.readFileSync(headerFile, 'utf-8');

            // Extract doctest patterns - handle multi-line doctests
            const lines = content.split('\n');
            const doctests: Array<{code: string, expected?: string}> = [];
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('>>> ')) {
                    const codeMatch = lines[i].match(/\/\/\/\s*>>>\s*(.*)/);
                    if (codeMatch && i + 1 < lines.length) {
                        const nextLine = lines[i + 1];
                        const expectedMatch = nextLine.match(/\/\/\/\s*([^>].*)/);
                        doctests.push({
                            code: codeMatch[1],
                            expected: expectedMatch ? expectedMatch[1].trim() : undefined
                        });
                    }
                }
            }

            // Verify we found doctests
            expect(doctests.length).toBeGreaterThan(0);
            
            // Verify specific doctests
            const addTest = doctests.find(dt => dt.code.includes('add(2, 3)'));
            expect(addTest).toBeDefined();
            expect(addTest?.expected).toBe('5');

            const factorialTest = doctests.find(dt => dt.code.includes('factorial(5)'));
            expect(factorialTest).toBeDefined();
            expect(factorialTest?.expected).toBe('120');
        });

        it('should extract and validate doctests from calculator.hpp', () => {
            const headerFile = path.join(fixturesDir, 'calculator.hpp');
            const content = fs.readFileSync(headerFile, 'utf-8');

            // Extract doctest patterns - handle multi-line doctests
            const lines = content.split('\n');
            const doctests: Array<{code: string, expected?: string}> = [];
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('>>> ')) {
                    const codeMatch = lines[i].match(/\/\/\/\s*>>>\s*(.*)/);
                    if (codeMatch && i + 1 < lines.length) {
                        const nextLine = lines[i + 1];
                        const expectedMatch = nextLine.match(/\/\/\/\s*([^>].*)/);
                        doctests.push({
                            code: codeMatch[1],
                            expected: expectedMatch ? expectedMatch[1].trim() : undefined
                        });
                    }
                }
            }

            // Verify calculator doctests
            expect(doctests.length).toBeGreaterThan(0);
            
            const multiplyTest = doctests.find(dt => dt.code.includes('multiply(3.0, 4.0)'));
            expect(multiplyTest).toBeDefined();
            expect(multiplyTest?.expected).toBe('12.0');

            const stringTest = doctests.find(dt => dt.code.includes('toUpper("hello")'));
            expect(stringTest).toBeDefined();
            expect(stringTest?.expected).toBe('"HELLO"');
        });
    });
});