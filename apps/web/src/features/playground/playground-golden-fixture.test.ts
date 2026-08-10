import { describe, expect, it } from 'vitest';

import { assertGoldenFixture } from './playground-golden-fixture';

describe('assertGoldenFixture', () => {
  it('accepts nested numeric results inside the fixture tolerance without relaxing nonnumeric fields', () => {
    expect(() =>
      assertGoldenFixture(
        {
          chartSummary: { residualMaxAbs: 0.00008 },
          metrics: { rmse: 0.00008 },
          textAlternative: { en: 'Stable result', vi: 'Káº¿t quáº£ á»•n Ä‘á»‹nh' },
        },
        {
          chartSummary: { residualMaxAbs: 0 },
          metrics: { rmse: 0 },
          textAlternative: { en: 'Stable result', vi: 'Káº¿t quáº£ á»•n Ä‘á»‹nh' },
        },
        0.0001,
      ),
    ).not.toThrow();
  });

  it('rejects a nested numeric value outside the existing fixture tolerance', () => {
    expect(() =>
      assertGoldenFixture({ metrics: { rmse: 0.0001001 } }, { metrics: { rmse: 0 } }, 0.0001),
    ).toThrowError(/metrics\.rmse/);
  });

  it('rejects a changed nonnumeric result even when the numeric tolerance is valid', () => {
    expect(() =>
      assertGoldenFixture(
        { textAlternative: { en: 'Different', vi: 'KhÃ¡c' } },
        { textAlternative: { en: 'Stable', vi: 'á»”n Ä‘á»‹nh' } },
        0.0001,
      ),
    ).toThrowError(/textAlternative\.en/);
  });
});
