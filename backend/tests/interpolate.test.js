const { interpolate } = require('../src/services/interpolate');

describe('interpolate', () => {
  it('returns price_before if timestamps are equal', () => {
    expect(interpolate(100, 100, 1, 100, 2)).toBe(1);
  });
  it('returns price_before if ts == ts_before', () => {
    expect(interpolate(100, 100, 1, 200, 2)).toBe(1);
  });
  it('returns price_after if ts == ts_after', () => {
    expect(interpolate(200, 100, 1, 200, 2)).toBe(2);
  });
  it('returns weighted average between before and after', () => {
    expect(interpolate(150, 100, 1, 200, 3)).toBe(2);
  });
}); 