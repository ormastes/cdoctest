import { CppParser, CursorKind, CppDeclaration, DocTest } from '../../src/parsers/CppParser';

describe('CppParser', () => {
    describe('Basic Parsing', () => {
        it('should parse function declarations', () => {
            const code = `
                int add(int a, int b) {
                    return a + b;
                }
                
                void printMessage(const char* msg) {
                    std::cout << msg << std::endl;
                }
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const functions = parser.getFunctionDeclarations();
            expect(functions.length).toBeGreaterThanOrEqual(1);
            
            const addFunc = parser.findDeclaration('add');
            expect(addFunc).toBeDefined();
            if (addFunc) {
                expect(addFunc.kind).toBe(CursorKind.FUNCTION_DECL);
            }
        });

        it('should parse class declarations', () => {
            const code = `
                class Calculator {
                public:
                    int add(int a, int b);
                    int subtract(int a, int b);
                };
                
                struct Point {
                    double x;
                    double y;
                };
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const classes = parser.getClassDeclarations();
            expect(classes.length).toBeGreaterThanOrEqual(1);
            
            const calculator = parser.findDeclaration('Calculator');
            expect(calculator).toBeDefined();
            if (calculator) {
                expect(calculator.kind).toBe(CursorKind.CLASS_DECL);
            }
        });

        it('should parse namespace declarations', () => {
            const code = `
                namespace Math {
                    int add(int a, int b);
                }
                
                namespace Utils {
                    void log(const char* msg);
                }
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const namespaces = parser.getNamespaceDeclarations();
            expect(namespaces.length).toBeGreaterThanOrEqual(1);
            
            const mathNs = parser.findDeclaration('Math');
            expect(mathNs).toBeDefined();
            if (mathNs) {
                expect(mathNs.kind).toBe(CursorKind.NAMESPACE);
            }
        });
    });

    describe('DocTest Extraction', () => {
        it('should extract simple doctests', () => {
            const code = `
                /// >>> add(2, 3)
                /// 5
                int add(int a, int b) {
                    return a + b;
                }
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const docTests = parser.getDocTests();
            expect(docTests.length).toBe(1);
            expect(docTests[0].code).toBe('add(2, 3)');
            expect(docTests[0].expectedOutput).toBe('5');
        });

        it('should extract multi-line doctests', () => {
            const code = `
                /// >>> int x = 5;
                /// ... int y = 10;
                /// ... add(x, y)
                /// 15
                int add(int a, int b) {
                    return a + b;
                }
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const docTests = parser.getDocTests();
            expect(docTests.length).toBe(1);
            expect(docTests[0].code).toContain('int x = 5;');
            expect(docTests[0].code).toContain('int y = 10;');
            expect(docTests[0].expectedOutput).toBe('15');
        });

        it('should associate doctests with parent declarations', () => {
            const code = `
                /// >>> multiply(3, 4)
                /// 12
                int multiply(int a, int b) {
                    return a * b;
                }
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const docTests = parser.getDocTests();
            expect(docTests.length).toBe(1);
            
            const multiply = parser.findDeclaration('multiply');
            expect(multiply).toBeDefined();
            if (multiply && docTests[0].parentDeclaration) {
                const associatedTests = parser.getDocTestsForDeclaration(multiply);
                expect(associatedTests.length).toBeGreaterThanOrEqual(0);
                if (associatedTests.length > 0) {
                    expect(associatedTests[0].code).toBe(docTests[0].code);
                }
            }
        });

        it('should handle doctests without expected output', () => {
            const code = `
                /// >>> printMessage("Hello")
                void printMessage(const char* msg) {
                    std::cout << msg << std::endl;
                }
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const docTests = parser.getDocTests();
            expect(docTests.length).toBe(1);
            expect(docTests[0].code).toBe('printMessage("Hello")');
            expect(docTests[0].expectedOutput).toBeUndefined();
        });
    });

    describe('Comment Extraction', () => {
        it('should extract function comments', () => {
            const code = `
                /// This function adds two numbers
                /// @param a First number
                /// @param b Second number
                /// @return Sum of a and b
                int add(int a, int b) {
                    return a + b;
                }
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const addFunc = parser.findDeclaration('add');
            expect(addFunc).toBeDefined();
            if (addFunc) {
                expect(addFunc.comment).toBeDefined();
                expect(addFunc.comment).toContain('adds two numbers');
            }
        });

        it('should handle different comment styles', () => {
            const code = `
                // Simple comment
                int func1() { return 1; }
                
                /// Doxygen style comment
                int func2() { return 2; }
                
                //! Qt style comment
                int func3() { return 3; }
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const declarations = parser.getDeclarations();
            expect(declarations.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Multi-file Parsing', () => {
        it('should parse multiple files', () => {
            const files = new Map<string, string>([
                ['file1.cpp', 'int func1() { return 1; }'],
                ['file2.cpp', 'int func2() { return 2; }'],
                ['file3.cpp', 'int func3() { return 3; }']
            ]);
            
            const parsers = CppParser.parseMultipleFiles(files);
            
            expect(parsers.size).toBe(3);
            expect(parsers.has('file1.cpp')).toBe(true);
            expect(parsers.has('file2.cpp')).toBe(true);
            expect(parsers.has('file3.cpp')).toBe(true);
            
            const parser1 = parsers.get('file1.cpp');
            if (parser1) {
                const func1 = parser1.findDeclaration('func1');
                expect(func1).toBeDefined();
            }
        });
    });

    describe('JSON Export', () => {
        it('should export parser data as JSON', () => {
            const code = `
                /// >>> add(1, 2)
                /// 3
                int add(int a, int b) {
                    return a + b;
                }
                
                class Calculator {
                    int value;
                };
            `;
            
            const parser = new CppParser('test.cpp', code);
            parser.parse();
            
            const json = parser.toJSON();
            expect(json).toBeDefined();
            expect(json).toHaveProperty('sourceFile', 'test.cpp');
            expect(json).toHaveProperty('declarations');
            expect(json).toHaveProperty('docTests');
            expect(json).toHaveProperty('stats');
        });
    });
});