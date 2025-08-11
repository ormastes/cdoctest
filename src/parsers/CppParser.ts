export enum CursorKind {
    STRUCT_DECL = 'STRUCT_DECL',
    UNION_DECL = 'UNION_DECL',
    CLASS_DECL = 'CLASS_DECL',
    FUNCTION_DECL = 'FUNCTION_DECL',
    CXX_METHOD = 'CXX_METHOD',
    NAMESPACE = 'NAMESPACE',
    CONSTRUCTOR = 'CONSTRUCTOR',
    DESTRUCTOR = 'DESTRUCTOR',
    FUNCTION_TEMPLATE = 'FUNCTION_TEMPLATE',
    CLASS_TEMPLATE = 'CLASS_TEMPLATE'
}

export interface SourceLocation {
    file: string;
    line: number;
    column: number;
}

export interface CppDeclaration {
    name: string;
    kind: CursorKind;
    location: SourceLocation;
    comment?: string;
    children?: CppDeclaration[];
    returnType?: string;
    parameters?: string[];
    access?: 'public' | 'private' | 'protected';
}

export interface DocTest {
    code: string;
    expectedOutput?: string;
    location: SourceLocation;
    parentDeclaration?: CppDeclaration;
}

export class CppParser {
    private sourceFile: string;
    private content: string;
    private declarations: CppDeclaration[] = [];
    private docTests: DocTest[] = [];

    constructor(sourceFile: string, content: string) {
        this.sourceFile = sourceFile;
        this.content = content;
    }

    parse(): void {
        this.parseDeclarations();
        this.extractDocTests();
    }

    private parseDeclarations(): void {
        const lines = this.content.split('\n');
        const declarationPatterns = [
            { pattern: /^\s*class\s+(\w+)/, kind: CursorKind.CLASS_DECL },
            { pattern: /^\s*struct\s+(\w+)/, kind: CursorKind.STRUCT_DECL },
            { pattern: /^\s*union\s+(\w+)/, kind: CursorKind.UNION_DECL },
            { pattern: /^\s*namespace\s+(\w+)/, kind: CursorKind.NAMESPACE },
            { pattern: /^\s*(?:template\s*<[^>]*>\s*)?(?:inline\s+)?(?:static\s+)?(?:const\s+)?(?:virtual\s+)?(?:[\w:]+\s+)?(\w+)\s*\([^)]*\)\s*(?:const)?\s*(?:override)?\s*[{;]/, kind: CursorKind.FUNCTION_DECL }
        ];

        lines.forEach((line, index) => {
            for (const { pattern, kind } of declarationPatterns) {
                const match = line.match(pattern);
                if (match) {
                    const decl: CppDeclaration = {
                        name: match[1],
                        kind,
                        location: {
                            file: this.sourceFile,
                            line: index + 1,
                            column: match.index || 0
                        }
                    };

                    const comment = this.extractComment(lines, index);
                    if (comment) {
                        decl.comment = comment;
                    }

                    this.declarations.push(decl);
                    break;
                }
            }
        });
    }

    private extractComment(lines: string[], declLine: number): string | undefined {
        const commentLines: string[] = [];
        
        for (let i = declLine - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('///') || line.startsWith('//!')) {
                commentLines.unshift(line.substring(3).trim());
            } else if (line.startsWith('//')) {
                commentLines.unshift(line.substring(2).trim());
            } else if (line === '' && commentLines.length > 0) {
                continue;
            } else {
                break;
            }
        }

        if (commentLines.length === 0) {
            const nextLine = lines[declLine + 1];
            if (nextLine && nextLine.trim().startsWith('//')) {
                return nextLine.trim().substring(2).trim();
            }
        }

        return commentLines.length > 0 ? commentLines.join('\n') : undefined;
    }

    private extractDocTests(): void {
        const lines = this.content.split('\n');
        const docTestPattern = /\/\/\/?\s*>>>\s*(.*)/;
        const outputPattern = /\/\/\/?\s*(.+)/;
        
        let currentTest: { code: string[]; output: string[]; startLine: number } | null = null;
        let inDocTest = false;

        lines.forEach((line, index) => {
            const docTestMatch = line.match(docTestPattern);
            
            if (docTestMatch) {
                if (currentTest) {
                    this.addDocTest(currentTest, index);
                }
                currentTest = {
                    code: [docTestMatch[1]],
                    output: [],
                    startLine: index + 1
                };
                inDocTest = true;
            } else if (inDocTest && currentTest) {
                const outputMatch = line.match(outputPattern);
                if (outputMatch && !line.includes('>>>')) {
                    if (line.includes('...')) {
                        currentTest.code.push(outputMatch[1].replace('...', '').trim());
                    } else {
                        currentTest.output.push(outputMatch[1]);
                    }
                } else if (line.trim() === '' || !line.trim().startsWith('//')) {
                    this.addDocTest(currentTest, index);
                    currentTest = null;
                    inDocTest = false;
                }
            }
        });

        if (currentTest) {
            this.addDocTest(currentTest, lines.length);
        }
    }

    private addDocTest(
        test: { code: string[]; output: string[]; startLine: number },
        endLine: number
    ): void {
        const docTest: DocTest = {
            code: test.code.join('\n'),
            expectedOutput: test.output.length > 0 ? test.output.join('\n') : undefined,
            location: {
                file: this.sourceFile,
                line: test.startLine,
                column: 0
            }
        };

        const parentDecl = this.findParentDeclaration(test.startLine);
        if (parentDecl) {
            docTest.parentDeclaration = parentDecl;
        }

        this.docTests.push(docTest);
    }

    private findParentDeclaration(line: number): CppDeclaration | undefined {
        let closest: CppDeclaration | undefined;
        let minDistance = Infinity;

        for (const decl of this.declarations) {
            if (decl.location.line < line) {
                const distance = line - decl.location.line;
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = decl;
                }
            }
        }

        return closest;
    }

    getDeclarations(): CppDeclaration[] {
        return this.declarations;
    }

    getDocTests(): DocTest[] {
        return this.docTests;
    }

    getFunctionDeclarations(): CppDeclaration[] {
        return this.declarations.filter(d => 
            d.kind === CursorKind.FUNCTION_DECL ||
            d.kind === CursorKind.CXX_METHOD ||
            d.kind === CursorKind.CONSTRUCTOR ||
            d.kind === CursorKind.DESTRUCTOR ||
            d.kind === CursorKind.FUNCTION_TEMPLATE
        );
    }

    getClassDeclarations(): CppDeclaration[] {
        return this.declarations.filter(d =>
            d.kind === CursorKind.CLASS_DECL ||
            d.kind === CursorKind.STRUCT_DECL ||
            d.kind === CursorKind.CLASS_TEMPLATE
        );
    }

    getNamespaceDeclarations(): CppDeclaration[] {
        return this.declarations.filter(d => d.kind === CursorKind.NAMESPACE);
    }

    findDeclaration(name: string): CppDeclaration | undefined {
        return this.declarations.find(d => d.name === name);
    }

    getDocTestsForDeclaration(declaration: CppDeclaration): DocTest[] {
        return this.docTests.filter(dt => 
            dt.parentDeclaration && 
            dt.parentDeclaration.name === declaration.name &&
            dt.parentDeclaration.kind === declaration.kind
        );
    }

    static parseMultipleFiles(files: Map<string, string>): Map<string, CppParser> {
        const parsers = new Map<string, CppParser>();
        
        files.forEach((content, filepath) => {
            const parser = new CppParser(filepath, content);
            parser.parse();
            parsers.set(filepath, parser);
        });
        
        return parsers;
    }

    toJSON(): object {
        return {
            sourceFile: this.sourceFile,
            declarations: this.declarations,
            docTests: this.docTests,
            stats: {
                totalDeclarations: this.declarations.length,
                functions: this.getFunctionDeclarations().length,
                classes: this.getClassDeclarations().length,
                namespaces: this.getNamespaceDeclarations().length,
                docTests: this.docTests.length
            }
        };
    }
}