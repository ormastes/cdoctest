export interface CMakeTarget {
    name: string;
    type: 'EXECUTABLE' | 'STATIC_LIBRARY' | 'SHARED_LIBRARY' | 'INTERFACE_LIBRARY';
    sources: string[];
    includePaths: string[];
    compileDefinitions: string[];
    compileOptions: string[];
    linkLibraries: string[];
}

export interface CMakeBuildConfig {
    name: string;
    directory: string;
    targets: CMakeTarget[];
}

export interface CMakeProject {
    name: string;
    version?: string;
    sourceDirectory: string;
    buildDirectory: string;
    configurations: CMakeBuildConfig[];
}

export class CMakeApi {
    private project: CMakeProject | null = null;
    private currentConfig: string = 'Debug';

    constructor(sourceDir?: string, buildDir?: string) {
        if (sourceDir && buildDir) {
            this.initialize(sourceDir, buildDir);
        }
    }

    private initialize(sourceDir: string, buildDir: string): void {
        this.project = {
            name: 'cdoctest',
            sourceDirectory: sourceDir,
            buildDirectory: buildDir,
            configurations: []
        };
    }

    async loadProject(sourceDir: string, buildDir: string): Promise<void> {
        this.initialize(sourceDir, buildDir);
    }

    getTarget(name: string): CMakeTarget | undefined {
        if (!this.project) return undefined;
        
        const config = this.project.configurations.find(c => c.name === this.currentConfig);
        if (!config) return undefined;
        
        return config.targets.find(t => t.name === name);
    }

    getAllTargets(): CMakeTarget[] {
        if (!this.project) return [];
        
        const config = this.project.configurations.find(c => c.name === this.currentConfig);
        return config ? config.targets : [];
    }

    getAllSources(): string[] {
        const sources = new Set<string>();
        const targets = this.getAllTargets();
        
        targets.forEach(target => {
            target.sources.forEach(source => sources.add(source));
        });
        
        return Array.from(sources);
    }

    getAllIncludePaths(): string[] {
        const includePaths = new Set<string>();
        const targets = this.getAllTargets();
        
        targets.forEach(target => {
            target.includePaths.forEach(path => includePaths.add(path));
        });
        
        return Array.from(includePaths);
    }

    getAllSharedLibraries(): string[] {
        const sharedLibs = new Set<string>();
        const targets = this.getAllTargets();
        
        targets.forEach(target => {
            if (target.type === 'SHARED_LIBRARY') {
                sharedLibs.add(target.name);
            }
            target.linkLibraries.forEach(lib => {
                if (lib.endsWith('.so') || lib.endsWith('.dll') || lib.endsWith('.dylib')) {
                    sharedLibs.add(lib);
                }
            });
        });
        
        return Array.from(sharedLibs);
    }

    getAllCandidateSourcesHeaders(): string[] {
        const candidates = new Set<string>();
        const sources = this.getAllSources();
        
        sources.forEach(source => {
            candidates.add(source);
            
            const headerExtensions = ['.h', '.hpp', '.hxx', '.h++'];
            const sourceExt = source.substring(source.lastIndexOf('.'));
            const baseName = source.substring(0, source.lastIndexOf('.'));
            
            headerExtensions.forEach(ext => {
                candidates.add(baseName + ext);
            });
        });
        
        return Array.from(candidates);
    }

    setConfiguration(configName: string): boolean {
        if (!this.project) return false;
        
        const config = this.project.configurations.find(c => c.name === configName);
        if (config) {
            this.currentConfig = configName;
            return true;
        }
        return false;
    }

    getConfiguration(): string {
        return this.currentConfig;
    }

    getProject(): CMakeProject | null {
        return this.project;
    }

    addTarget(target: CMakeTarget, configName?: string): void {
        if (!this.project) return;
        
        const config = configName || this.currentConfig;
        let targetConfig = this.project.configurations.find(c => c.name === config);
        
        if (!targetConfig) {
            targetConfig = {
                name: config,
                directory: `${this.project.buildDirectory}/${config}`,
                targets: []
            };
            this.project.configurations.push(targetConfig);
        }
        
        const existingIndex = targetConfig.targets.findIndex(t => t.name === target.name);
        if (existingIndex !== -1) {
            targetConfig.targets[existingIndex] = target;
        } else {
            targetConfig.targets.push(target);
        }
    }

    removeTarget(name: string, configName?: string): boolean {
        if (!this.project) return false;
        
        const config = configName || this.currentConfig;
        const targetConfig = this.project.configurations.find(c => c.name === config);
        
        if (!targetConfig) return false;
        
        const index = targetConfig.targets.findIndex(t => t.name === name);
        if (index !== -1) {
            targetConfig.targets.splice(index, 1);
            return true;
        }
        
        return false;
    }

    getExecutableTargets(): CMakeTarget[] {
        return this.getAllTargets().filter(t => t.type === 'EXECUTABLE');
    }

    getLibraryTargets(): CMakeTarget[] {
        return this.getAllTargets().filter(t => 
            t.type === 'STATIC_LIBRARY' || 
            t.type === 'SHARED_LIBRARY' || 
            t.type === 'INTERFACE_LIBRARY'
        );
    }

    findTargetForSource(sourceFile: string): CMakeTarget | undefined {
        const targets = this.getAllTargets();
        return targets.find(target => 
            target.sources.some(src => src.endsWith(sourceFile))
        );
    }

    getCompileCommandsForSource(sourceFile: string): {
        definitions: string[];
        options: string[];
        includePaths: string[];
    } | undefined {
        const target = this.findTargetForSource(sourceFile);
        if (!target) return undefined;
        
        return {
            definitions: target.compileDefinitions,
            options: target.compileOptions,
            includePaths: target.includePaths
        };
    }
}