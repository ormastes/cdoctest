import { main } from '../src/index';

describe('Main function', () => {
    it('should run without errors', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        main();
        expect(consoleSpy).toHaveBeenCalledWith('TypeScript environment is set up and running!');
        consoleSpy.mockRestore();
    });
});
