// Simple test to verify Vitest setup
describe('Simple Test', () => {
  it('should work with basic vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('should mock functions', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});