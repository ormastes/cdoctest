export * from './CDocTest';
export * from './models/Test';
export * from './parsers/CppParser';
export * from './interfaces/CMakeApi';
export * from './services/TestRunner';
export * from './services/CoverageReporter';

import { CDocTest } from './CDocTest';

export function main(): void {
    console.log('TypeScript environment is set up and running!');
}

if (require.main === module) {
    main();
}

export default CDocTest;
