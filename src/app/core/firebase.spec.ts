import { startFirebase } from './firebase';

describe('firebase', () => {
  it('should_start_without_throwing_when_analytics_is_unavailable', () => {
    expect(() => startFirebase()).not.toThrow();
  });
});
