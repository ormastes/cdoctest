import { CMakeApi, CMakeTarget, CMakeProject } from '../../src/interfaces/CMakeApi';

describe('CMakeApi', () => {
    let cmakeApi: CMakeApi;

    beforeEach(() => {
        cmakeApi = new CMakeApi('/src', '/build');
    });

    describe('Initialization', () => {
        it('should create CMakeApi instance', () => {
            expect(cmakeApi).toBeDefined();
            expect(cmakeApi.getConfiguration()).toBe('Debug');
        });

        it('should load project', async () => {
            await cmakeApi.loadProject('/new/src', '/new/build');
            const project = cmakeApi.getProject();
            
            expect(project).toBeDefined();
            if (project) {
                expect(project.sourceDirectory).toBe('/new/src');
                expect(project.buildDirectory).toBe('/new/build');
            }
        });
    });

    describe('Target Management', () => {
        let testTarget: CMakeTarget;

        beforeEach(() => {
            testTarget = {
                name: 'test_app',
                type: 'EXECUTABLE',
                sources: ['main.cpp', 'utils.cpp'],
                includePaths: ['/usr/include', '/usr/local/include'],
                compileDefinitions: ['DEBUG', 'TEST_MODE'],
                compileOptions: ['-O2', '-Wall'],
                linkLibraries: ['pthread', 'math']
            };
        });

        it('should add and retrieve target', () => {
            cmakeApi.addTarget(testTarget);
            
            const retrieved = cmakeApi.getTarget('test_app');
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('test_app');
            expect(retrieved?.type).toBe('EXECUTABLE');
        });

        it('should update existing target', () => {
            cmakeApi.addTarget(testTarget);
            
            const updatedTarget = { ...testTarget, type: 'STATIC_LIBRARY' as const };
            cmakeApi.addTarget(updatedTarget);
            
            const retrieved = cmakeApi.getTarget('test_app');
            expect(retrieved?.type).toBe('STATIC_LIBRARY');
        });

        it('should remove target', () => {
            cmakeApi.addTarget(testTarget);
            
            const removed = cmakeApi.removeTarget('test_app');
            expect(removed).toBe(true);
            
            const retrieved = cmakeApi.getTarget('test_app');
            expect(retrieved).toBeUndefined();
        });

        it('should get all targets', () => {
            const target1: CMakeTarget = { ...testTarget, name: 'target1' };
            const target2: CMakeTarget = { ...testTarget, name: 'target2' };
            
            cmakeApi.addTarget(target1);
            cmakeApi.addTarget(target2);
            
            const allTargets = cmakeApi.getAllTargets();
            expect(allTargets.length).toBe(2);
            expect(allTargets.map(t => t.name)).toContain('target1');
            expect(allTargets.map(t => t.name)).toContain('target2');
        });

        it('should filter executable targets', () => {
            const exe: CMakeTarget = { ...testTarget, name: 'exe', type: 'EXECUTABLE' };
            const lib: CMakeTarget = { ...testTarget, name: 'lib', type: 'STATIC_LIBRARY' };
            
            cmakeApi.addTarget(exe);
            cmakeApi.addTarget(lib);
            
            const executables = cmakeApi.getExecutableTargets();
            expect(executables.length).toBe(1);
            expect(executables[0].name).toBe('exe');
        });

        it('should filter library targets', () => {
            const exe: CMakeTarget = { ...testTarget, name: 'exe', type: 'EXECUTABLE' };
            const staticLib: CMakeTarget = { ...testTarget, name: 'static', type: 'STATIC_LIBRARY' };
            const sharedLib: CMakeTarget = { ...testTarget, name: 'shared', type: 'SHARED_LIBRARY' };
            
            cmakeApi.addTarget(exe);
            cmakeApi.addTarget(staticLib);
            cmakeApi.addTarget(sharedLib);
            
            const libraries = cmakeApi.getLibraryTargets();
            expect(libraries.length).toBe(2);
            expect(libraries.map(t => t.name)).toContain('static');
            expect(libraries.map(t => t.name)).toContain('shared');
        });
    });

    describe('Source Management', () => {
        beforeEach(() => {
            const target1: CMakeTarget = {
                name: 'target1',
                type: 'EXECUTABLE',
                sources: ['main.cpp', 'utils.cpp', 'shared.cpp'],
                includePaths: ['/include1', '/include2'],
                compileDefinitions: [],
                compileOptions: [],
                linkLibraries: []
            };
            
            const target2: CMakeTarget = {
                name: 'target2',
                type: 'STATIC_LIBRARY',
                sources: ['lib.cpp', 'shared.cpp'],
                includePaths: ['/include2', '/include3'],
                compileDefinitions: [],
                compileOptions: [],
                linkLibraries: []
            };
            
            cmakeApi.addTarget(target1);
            cmakeApi.addTarget(target2);
        });

        it('should get all unique sources', () => {
            const sources = cmakeApi.getAllSources();
            
            expect(sources).toContain('main.cpp');
            expect(sources).toContain('utils.cpp');
            expect(sources).toContain('lib.cpp');
            expect(sources).toContain('shared.cpp');
            expect(sources.filter(s => s === 'shared.cpp').length).toBe(1);
        });

        it('should get all unique include paths', () => {
            const includes = cmakeApi.getAllIncludePaths();
            
            expect(includes).toContain('/include1');
            expect(includes).toContain('/include2');
            expect(includes).toContain('/include3');
            expect(includes.filter(i => i === '/include2').length).toBe(1);
        });

        it('should find target for source file', () => {
            const target = cmakeApi.findTargetForSource('main.cpp');
            
            expect(target).toBeDefined();
            expect(target?.name).toBe('target1');
        });

        it('should get compile commands for source', () => {
            const commands = cmakeApi.getCompileCommandsForSource('main.cpp');
            
            expect(commands).toBeDefined();
            if (commands) {
                expect(commands.includePaths).toContain('/include1');
                expect(commands.includePaths).toContain('/include2');
            }
        });

        it('should get candidate source headers', () => {
            const candidates = cmakeApi.getAllCandidateSourcesHeaders();
            
            expect(candidates).toContain('main.cpp');
            expect(candidates).toContain('main.h');
            expect(candidates).toContain('main.hpp');
            expect(candidates).toContain('utils.cpp');
            expect(candidates).toContain('utils.h');
        });
    });

    describe('Configuration Management', () => {
        beforeEach(() => {
            const debugTarget: CMakeTarget = {
                name: 'app',
                type: 'EXECUTABLE',
                sources: ['main.cpp'],
                includePaths: [],
                compileDefinitions: ['DEBUG'],
                compileOptions: ['-g'],
                linkLibraries: []
            };
            
            const releaseTarget: CMakeTarget = {
                name: 'app',
                type: 'EXECUTABLE',
                sources: ['main.cpp'],
                includePaths: [],
                compileDefinitions: ['NDEBUG'],
                compileOptions: ['-O3'],
                linkLibraries: []
            };
            
            cmakeApi.addTarget(debugTarget, 'Debug');
            cmakeApi.addTarget(releaseTarget, 'Release');
        });

        it('should switch configurations', () => {
            expect(cmakeApi.getConfiguration()).toBe('Debug');
            
            const switched = cmakeApi.setConfiguration('Release');
            expect(switched).toBe(true);
            expect(cmakeApi.getConfiguration()).toBe('Release');
            
            const target = cmakeApi.getTarget('app');
            expect(target?.compileOptions).toContain('-O3');
        });

        it('should return false for invalid configuration', () => {
            const switched = cmakeApi.setConfiguration('NonExistent');
            expect(switched).toBe(false);
            expect(cmakeApi.getConfiguration()).toBe('Debug');
        });
    });

    describe('Shared Libraries', () => {
        beforeEach(() => {
            const sharedLib: CMakeTarget = {
                name: 'mylib',
                type: 'SHARED_LIBRARY',
                sources: ['lib.cpp'],
                includePaths: [],
                compileDefinitions: [],
                compileOptions: [],
                linkLibraries: []
            };
            
            const app: CMakeTarget = {
                name: 'app',
                type: 'EXECUTABLE',
                sources: ['main.cpp'],
                includePaths: [],
                compileDefinitions: [],
                compileOptions: [],
                linkLibraries: ['mylib', 'pthread.so', 'custom.dll', 'other.dylib']
            };
            
            cmakeApi.addTarget(sharedLib);
            cmakeApi.addTarget(app);
        });

        it('should get all shared libraries', () => {
            const sharedLibs = cmakeApi.getAllSharedLibraries();
            
            expect(sharedLibs).toContain('mylib');
            expect(sharedLibs).toContain('pthread.so');
            expect(sharedLibs).toContain('custom.dll');
            expect(sharedLibs).toContain('other.dylib');
        });
    });
});