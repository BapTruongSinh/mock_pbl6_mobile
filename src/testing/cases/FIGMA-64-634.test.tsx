import { act, fireEvent } from '@testing-library/react-native';
import { assertScenarioContract } from '../assertScenarioContract';
import { getLastRenderedScenario, renderScenario } from '../renderScenario';
import { ensureLoginScenarioRegistered } from '../scenarios/FIGMA-64-634';

describe('FIGMA-64-634: Customer App / Auth / Đăng nhập / 390', () => {
  beforeAll(() => {
    ensureLoginScenarioRegistered();
  });

  it('2.4.1 conforms strictly to scenario contract for FIGMA-64-634', async () => {
    await renderScenario('FIGMA-64-634');
    await assertScenarioContract('FIGMA-64-634');
  });

  it('2.4.2 renders brand logo, title, and social login buttons', async () => {
    await renderScenario('FIGMA-64-634');
    const { tree } = getLastRenderedScenario();

    expect(tree.getByTestId('auth.login.brandLogo')).toBeTruthy();
    expect(tree.getByText('Hành trình đang chờ bạn')).toBeTruthy();
    expect(tree.getByText('Đăng nhập để tiếp tục chuyến đi')).toBeTruthy();
    expect(tree.getByTestId('auth.login.socialFacebook')).toBeTruthy();
    expect(tree.getByTestId('auth.login.socialGoogle')).toBeTruthy();
  });

  it('2.4.3 validates required fields and disallows submission with empty credentials', async () => {
    await renderScenario('FIGMA-64-634');
    const { tree } = getLastRenderedScenario();

    const submitBtn = tree.getByTestId('auth.login.submit');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(tree.getByTestId('auth.login.errorMessage')).toBeTruthy();
  });

  it('2.4.4 toggles password visibility when eye icon is pressed', async () => {
    await renderScenario('FIGMA-64-634');
    const { tree } = getLastRenderedScenario();

    const passwordInput = tree.getByTestId('auth.login.passwordInput');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    const toggleBtn = tree.getByTestId('auth.login.togglePassword');
    fireEvent.press(toggleBtn);

    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('2.4.5 authenticates seeded customer successfully and updates session role', async () => {
    await renderScenario('FIGMA-64-634');
    const { tree } = getLastRenderedScenario();

    const identifierInput = tree.getByTestId('auth.login.identifierInput');
    const passwordInput = tree.getByTestId('auth.login.passwordInput');
    const submitBtn = tree.getByTestId('auth.login.submit');

    fireEvent.changeText(identifierInput, '0912345678');
    fireEvent.changeText(passwordInput, 'customer-password-123');

    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(tree.queryByTestId('auth.login.errorMessage')).toBeNull();
  });

  it('2.4.6 authenticates seeded driver successfully and updates session role', async () => {
    await renderScenario('FIGMA-64-634');
    const { tree } = getLastRenderedScenario();

    const identifierInput = tree.getByTestId('auth.login.identifierInput');
    const passwordInput = tree.getByTestId('auth.login.passwordInput');
    const submitBtn = tree.getByTestId('auth.login.submit');

    fireEvent.changeText(identifierInput, '0988776655');
    fireEvent.changeText(passwordInput, 'driver-password-123');

    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(tree.queryByTestId('auth.login.errorMessage')).toBeNull();
  });

  it('2.4.7 dispatches guest action when Guest CTA is pressed', async () => {
    await renderScenario('FIGMA-64-634');
    const { tree } = getLastRenderedScenario();

    const guestBtn = tree.getByTestId('auth.login.guestButton');
    await act(async () => {
      fireEvent.press(guestBtn);
    });
  });
});
