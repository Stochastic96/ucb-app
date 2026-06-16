import { getNewsIdentity } from '../../services/news';

describe('getNewsIdentity', () => {
  it('returns an empty string for a null item', () => {
    expect(getNewsIdentity(null)).toBe('');
  });

  it('prefers an explicit uniqueKey', () => {
    expect(getNewsIdentity({ uniqueKey: 'custom:1', id: '99' })).toBe('custom:1');
  });

  it('derives sourceKey:id from sourceKey', () => {
    expect(getNewsIdentity({ sourceKey: 'course:42', id: '7' })).toBe('course:42:7');
  });

  it('falls back to source, then to "news", for the key prefix', () => {
    expect(getNewsIdentity({ source: 'Personal', id: '3' })).toBe('Personal:3');
    expect(getNewsIdentity({ id: '5' })).toBe('news:5');
  });
});
