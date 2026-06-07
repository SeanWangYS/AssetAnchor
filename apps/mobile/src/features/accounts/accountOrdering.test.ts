import { nextDisplayOrder } from './accountOrdering';

describe('nextDisplayOrder', () => {
  it('returns 1 for an empty list', () => {
    expect(nextDisplayOrder([])).toBe(1);
  });

  it('returns max + 1 for a single account', () => {
    expect(nextDisplayOrder([{ display_order: 1 }])).toBe(2);
  });

  it('uses the maximum regardless of order', () => {
    expect(
      nextDisplayOrder([{ display_order: 3 }, { display_order: 1 }, { display_order: 2 }]),
    ).toBe(4);
  });

  it('handles gaps in display_order', () => {
    expect(nextDisplayOrder([{ display_order: 5 }, { display_order: 9 }])).toBe(10);
  });
});
