import { act } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { getLastRenderedScenario, renderScenario } from '../renderScenario';
import { ensureLoginScenarioRegistered } from '../scenarios/FIGMA-64-634';

describe('Login responsive boundary (native geometry checked separately)', () => {
  beforeAll(ensureLoginScenarioRegistered);
  const original = ReactNative.Dimensions.get('window');
  afterEach(() => {
    act(() => ReactNative.Dimensions.set({ window: original, screen: original }));
  });
  it.each([
    [320, 1],
    [320, 2],
    [390, 1.3],
    [480, 2],
  ])(
    'reflows rows and releases text/input heights at width %s fontScale %s',
    async (width, fontScale) => {
      act(() =>
        ReactNative.Dimensions.set({
          window: { width, height: 844, scale: 1, fontScale },
          screen: { width, height: 844, scale: 1, fontScale },
        }),
      );
      await renderScenario('FIGMA-64-634');
      const { tree } = getLastRenderedScenario();
      const style = (id: string): ReactNative.ViewStyle & ReactNative.TextStyle =>
        ReactNative.StyleSheet.flatten(tree.getByTestId(id).props.style);
      expect(style('auth.login.socialRow').flexDirection).toBe('column');
      expect(style('auth.login.optionsRow').flexDirection).toBe('column');
      expect(style('auth.login.title').lineHeight).toBeUndefined();
      expect(style('auth.login.divider').minHeight).toBeGreaterThanOrEqual(14 * fontScale);
      expect(style('auth.login.identifierInput').height).toBeUndefined();
      expect(style('auth.login.guestButton').paddingVertical).toBeGreaterThanOrEqual(8);
      expect(style('auth.login.title').width).toBeLessThanOrEqual(Math.min(310, width - 80));
      expect(tree.getByTestId('auth.login.title').props.allowFontScaling).not.toBe(false);
    },
  );
  it('preserves canonical title and CTA metrics', async () => {
    act(() =>
      ReactNative.Dimensions.set({
        window: { width: 390, height: 844, scale: 1, fontScale: 1 },
        screen: { width: 390, height: 844, scale: 1, fontScale: 1 },
      }),
    );
    await renderScenario('FIGMA-64-634');
    const { tree } = getLastRenderedScenario();
    const style = (id: string): ReactNative.ViewStyle & ReactNative.TextStyle =>
      ReactNative.StyleSheet.flatten(tree.getByTestId(id).props.style);
    expect(style('auth.login.title').lineHeight).toBe(38);
    expect(style('auth.login.title').height).toBe(38);
    expect(style('auth.login.title').includeFontPadding).toBe(false);
    expect(style('auth.login.guestButton').minHeight).toBe(38);
  });
});
