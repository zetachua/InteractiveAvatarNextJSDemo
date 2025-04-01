// sum.test.ts

// A simple function to test
function sum(a: number, b: number): number {
    return a + b;
  }
  
  // The test case
  describe("sum function", () => {
    test("adds 1 + 2 to equal 3", () => {
      expect(sum(1, 2)).toBe(3);
    });
  
    test("adds -1 + 1 to equal 0", () => {
      expect(sum(-1, 1)).toBe(0);
    });
  });