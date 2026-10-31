import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HOLD_DURATION_MS, MAX_SEATS } from '../../domain/types';
import { createTestWorld } from '../createTestWorld';
import {
  clearScenarioRegistryForTests,
  getActiveScenarioId,
  getScenario,
  launchScenario,
  registerScenario,
  subscribeScenarioLaunch,
} from '../scenarios/registry';
import {
  getCaseContract,
  registerCaseContract,
  resetCaseContractsForTests,
} from '../scenarios/caseContracts';
import { getLastRenderedScenario, renderScenario } from '../renderScenario';
import { assertScenarioContract } from '../assertScenarioContract';
import { handleHarnessDeepLink, parseHarnessDeepLink } from '../nativeHarness';
import { colors, typography } from '../../shared/theme/tokens';
import { App, FoundationBootstrapView } from '../../app/App';
import { AppProviders, useAppDependencies } from '../../app/providers/AppProviders';

describe('Plan 01 — Task 1 Core Domain, Repository, Storage, Scenario Harness & Asset Provenance', () => {
  beforeEach(() => {
    clearScenarioRegistryForTests();
    resetCaseContractsForTests();
  });

  test('createTestWorld seeds canonical fixtures into repository and validates auth/ownership/expiry', async () => {
    const world = createTestWorld({ caseId: 'PLAN01-UNIT' });
    expect(world.clock.now()).toBe(Date.parse('2026-08-27T00:00:00+07:00'));
    expect(world.fixtures.hold.expiresAt).toBe(world.clock.now() + HOLD_DURATION_MS);
    expect(MAX_SEATS).toBe(6);

    const init = await world.repository.initialize();
    expect(init.ok).toBe(true);

    const tripRes = await world.repository.getTrip('TR-204');
    expect(tripRes).toEqual({ ok: true, value: world.fixtures.trip });
    expect(world.calls.count('getTrip')).toBe(1);

    expect((await world.repository.getTrip('TR-UNKNOWN')).ok).toBe(false);
    expect((await world.repository.getSeats('TR-UNKNOWN')).ok).toBe(false);

    const seatsRes = await world.repository.getSeats('TR-204');
    expect(seatsRes.ok).toBe(true);
    if (seatsRes.ok) {
      expect(seatsRes.value).toHaveLength(8);
    }

    const holdRes = await world.repository.revalidateHold({
      holdId: world.fixtures.hold.id,
      version: world.fixtures.hold.version,
    });
    expect(holdRes).toEqual({ ok: true, value: world.fixtures.hold });

    expect((await world.repository.revalidateHold({ holdId: 'HOLD-MISSING', version: 1 })).ok).toBe(
      false,
    );
    expect(
      (await world.repository.revalidateHold({ holdId: world.fixtures.hold.id, version: 99 })).ok,
    ).toBe(false);

    const reviewRes = await world.repository.getBookingReview(
      world.fixtures.draft.id,
      world.sessions.customer,
    );
    expect(reviewRes.ok).toBe(true);
    expect(
      (
        await world.repository.getBookingReview(
          world.fixtures.draft.id,
          world.sessions.otherCustomer,
        )
      ).ok,
    ).toBe(false);
    expect(
      (await world.repository.getBookingReview('DRAFT-MISSING', world.sessions.customer)).ok,
    ).toBe(false);

    const ticketsRes = await world.repository.getTickets(world.sessions.customer);
    expect(ticketsRes.ok).toBe(true);
    if (ticketsRes.ok) {
      expect(ticketsRes.value).toHaveLength(1);
    }
    expect((await world.repository.getTickets(world.sessions.driver)).ok).toBe(false);

    const ticketRes = await world.repository.getTicket(
      world.fixtures.ticket.id,
      world.sessions.customer,
    );
    expect(ticketRes.ok).toBe(true);
    if (ticketRes.ok) {
      expect(ticketRes.value.code).toBe('TK-A01');
      expect(ticketRes.value.bookingPhone).toBe('0912345678');
    }

    expect((await world.repository.getTicket('TICKET-MISSING', world.sessions.customer)).ok).toBe(
      false,
    );
    expect(
      (await world.repository.getTicket(world.fixtures.ticket.id, world.sessions.otherCustomer)).ok,
    ).toBe(false);

    const driverTripsRes = await world.repository.getAssignedTrips(world.sessions.driver);
    expect(driverTripsRes.ok).toBe(true);
    if (driverTripsRes.ok) {
      expect(driverTripsRes.value.map((t) => t.id)).toContain('TR-204');
    }
    expect((await world.repository.getAssignedTrips(world.sessions.customer)).ok).toBe(false);

    expect((await world.repository.getAssignedTrip('TR-204', world.sessions.driver)).ok).toBe(true);
    expect(
      (await world.repository.getAssignedTrip('TR-UNASSIGNED', world.sessions.driver)).ok,
    ).toBe(false);

    expect((await world.repository.getDriverAccount(world.sessions.driver)).ok).toBe(true);
    expect((await world.repository.getManifest('TR-204', world.sessions.driver)).ok).toBe(true);
    expect((await world.repository.getManifest('TR-UNASSIGNED', world.sessions.driver)).ok).toBe(
      false,
    );

    // Invalid / expired session checks
    const invalidSession = { ...world.sessions.customer, accessToken: '' };
    expect((await world.repository.getTickets(invalidSession)).ok).toBe(false);

    // F05 regression: forged token, forged sessionId, NaN expiresAt, and unknown account must be rejected
    const forgedTokenSession = {
      ...world.sessions.customer,
      accessToken: 'forged-arbitrary-nonempty-token',
    };
    expect((await world.repository.getTickets(forgedTokenSession)).ok).toBe(false);
    expect(
      (await world.repository.getTicket(world.fixtures.ticket.id, forgedTokenSession)).ok,
    ).toBe(false);
    expect(
      (await world.repository.getBookingReview(world.fixtures.draft.id, forgedTokenSession)).ok,
    ).toBe(false);

    const forgedDriverTokenSession = {
      ...world.sessions.driver,
      accessToken: 'forged-driver-token',
    };
    expect((await world.repository.getAssignedTrips(forgedDriverTokenSession)).ok).toBe(false);
    expect((await world.repository.getDriverAccount(forgedDriverTokenSession)).ok).toBe(false);
    expect((await world.repository.getManifest('TR-204', forgedDriverTokenSession)).ok).toBe(false);

    const forgedSessionId = {
      ...world.sessions.customer,
      sessionId: 'FORGED-SESSION-ID',
    };
    expect((await world.repository.getTickets(forgedSessionId)).ok).toBe(false);

    const nanExpirySession = {
      ...world.sessions.customer,
      expiresAt: Number.NaN,
    };
    expect((await world.repository.getTickets(nanExpirySession)).ok).toBe(false);

    await world.repository.logout(world.sessions.customer);
    expect(world.calls.count('logout')).toBe(1);

    expect(() => world.clock.advanceBy(-5)).toThrow(/non-negative/i);
    world.clock.advanceBy(15000);
    expect(world.clock.now()).toBe(Date.parse('2026-08-27T00:00:15+07:00'));

    // Advance past hold & session expiry
    world.clock.advanceBy(3600000);
    const expiredHold = await world.repository.revalidateHold({
      holdId: world.fixtures.hold.id,
      version: world.fixtures.hold.version,
    });
    expect(expiredHold.ok).toBe(false);
    expect((await world.repository.getTickets(world.sessions.customer)).ok).toBe(false);
  });

  test('out-of-scope repository mutations and fault injection behave deterministically on world.repository', async () => {
    const world = createTestWorld();
    await world.repository.initialize();

    const methodsResult = await Promise.all([
      world.repository.search({
        origin: 'HCM',
        destination: 'Da Lat',
        departureDate: '2026-08-27',
        passengerCount: 1,
      }),
      world.repository.holdSeats({
        tripId: 'TR-204',
        seatIds: ['A02'],
        guestSessionId: 'GUEST-1',
        idempotencyKey: 'idem-1',
      }),
      world.repository.replaceHold({
        holdId: 'HOLD-204',
        seatIds: ['A03'],
        version: 1,
        guestSessionId: 'GUEST-1',
        idempotencyKey: 'idem-2',
      }),
      world.repository.releaseHold({ holdId: 'HOLD-204', guestSessionId: 'GUEST-1' }),
      world.repository.createBookingDraft({
        holdId: 'HOLD-204',
        guestSessionId: 'GUEST-1',
        idempotencyKey: 'idem-3',
      }),
      world.repository.claimBookingDraft({
        draftId: 'DRAFT-204',
        guestSessionId: 'GUEST-1',
        holdVersion: 1,
        session: world.sessions.customer,
      }),
      world.repository.savePassengers({
        draftId: 'DRAFT-204',
        passengers: [{ seatId: 'A02', fullName: 'Test', phone: '0912345678' }],
        session: world.sessions.customer,
      }),
      world.repository.createPayment({
        draftId: 'DRAFT-204',
        session: world.sessions.customer,
        idempotencyKey: 'idem-4',
      }),
      world.repository.getPayment('PAY-1', world.sessions.customer),
      world.repository.quoteCancellation({
        ticketIds: ['TICKET-204-A01'],
        session: world.sessions.customer,
      }),
      world.repository.cancelTickets({
        quoteId: 'QUOTE-204',
        version: 1,
        session: world.sessions.customer,
        idempotencyKey: 'idem-5',
      }),
      world.repository.getRefund('REF-1', world.sessions.customer),
      world.repository.checkIn({
        tripId: 'TR-204',
        ticketCode: 'TK-A01',
        session: world.sessions.driver,
        idempotencyKey: 'idem-6',
      }),
      world.repository.getCheckIn('CHK-1', world.sessions.driver),
      world.repository.transitionTrip({
        tripId: 'TR-204',
        to: 'boarding',
        version: 1,
        session: world.sessions.driver,
        idempotencyKey: 'idem-7',
      }),
      world.repository.getOperation({
        kind: 'payment',
        idempotencyKey: 'idem-4',
        session: world.sessions.customer,
      }),
    ]);

    for (const res of methodsResult) {
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe('notImplemented');
      }
    }

    // Fault injection in TestWorld for all 4 mutation types
    world.faults.once('createPayment', 'networkBeforeCommit');
    expect(
      (
        await world.repository.createPayment({
          draftId: 'DRAFT-204',
          session: world.sessions.customer,
          idempotencyKey: 'idem-f1',
        })
      ).ok,
    ).toBe(false);

    world.faults.once('createPayment', 'timeoutAfterCommit');
    expect(
      (
        await world.repository.createPayment({
          draftId: 'DRAFT-204',
          session: world.sessions.customer,
          idempotencyKey: 'idem-f2',
        })
      ).ok,
    ).toBe(false);

    world.faults.once('cancelTickets', 'networkBeforeCommit');
    expect(
      (
        await world.repository.cancelTickets({
          quoteId: 'QUOTE-204',
          version: 1,
          session: world.sessions.customer,
          idempotencyKey: 'idem-f3',
        })
      ).ok,
    ).toBe(false);

    world.faults.once('cancelTickets', 'timeoutAfterCommit');
    expect(
      (
        await world.repository.cancelTickets({
          quoteId: 'QUOTE-204',
          version: 1,
          session: world.sessions.customer,
          idempotencyKey: 'idem-f4',
        })
      ).ok,
    ).toBe(false);

    world.faults.once('checkIn', 'networkBeforeCommit');
    expect(
      (
        await world.repository.checkIn({
          tripId: 'TR-204',
          ticketCode: 'TK-A01',
          session: world.sessions.driver,
          idempotencyKey: 'idem-f5',
        })
      ).ok,
    ).toBe(false);

    world.faults.once('checkIn', 'timeoutAfterCommit');
    expect(
      (
        await world.repository.checkIn({
          tripId: 'TR-204',
          ticketCode: 'TK-A01',
          session: world.sessions.driver,
          idempotencyKey: 'idem-f6',
        })
      ).ok,
    ).toBe(false);

    world.faults.once('transitionTrip', 'networkBeforeCommit');
    expect(
      (
        await world.repository.transitionTrip({
          tripId: 'TR-204',
          to: 'boarding',
          version: 1,
          session: world.sessions.driver,
          idempotencyKey: 'idem-f7',
        })
      ).ok,
    ).toBe(false);

    world.faults.once('transitionTrip', 'timeoutAfterCommit');
    expect(
      (
        await world.repository.transitionTrip({
          tripId: 'TR-204',
          to: 'boarding',
          version: 1,
          session: world.sessions.driver,
          idempotencyKey: 'idem-f8',
        })
      ).ok,
    ).toBe(false);
  });

  test('scenario registry and caseContracts validate inputs and reject duplicate/unknown IDs', async () => {
    const launched: string[] = [];
    const unsubscribe = subscribeScenarioLaunch((id) => launched.push(id));

    const dummyScenario = {
      id: 'TEST-CASE-1',
      route: 'FoundationSmoke',
      reset: () => undefined,
      expectedTestIds: ['screen.TEST-CASE-1'],
      render: () => React.createElement(View, { testID: 'screen.TEST-CASE-1' }),
    };

    registerScenario(dummyScenario);
    expect(getScenario('TEST-CASE-1').id).toBe('TEST-CASE-1');

    await launchScenario('TEST-CASE-1');
    expect(getActiveScenarioId()).toBe('TEST-CASE-1');
    expect(launched).toEqual(['TEST-CASE-1']);
    unsubscribe();

    expect(() => registerScenario(dummyScenario)).toThrow(/duplicate/i);
    expect(() =>
      registerScenario({ id: '', route: 'R', reset: () => undefined, expectedTestIds: ['a'] }),
    ).toThrow(/id must be/i);
    expect(() =>
      registerScenario({ id: 'X', route: '', reset: () => undefined, expectedTestIds: ['a'] }),
    ).toThrow(/route is required/i);
    expect(() =>
      registerScenario({ id: 'Y', route: 'R', reset: () => undefined, expectedTestIds: [] }),
    ).toThrow(/expectedTestIds/i);
    expect(() => getScenario('UNKNOWN-CASE-ID')).toThrow(/unknown/i);
    await expect(launchScenario('UNKNOWN-CASE-ID')).rejects.toThrow(/unknown/i);

    expect(() =>
      registerCaseContract({
        caseId: '',
        route: 'R',
        sourceStatus: 'verified',
        requiredTestIds: [],
        expectedTextByTestId: {},
        forbiddenTestIds: [],
      }),
    ).toThrow(/non-empty caseId/i);
    expect(() => getCaseContract('UNKNOWN-CONTRACT')).toThrow(/Unknown CaseContract/i);
  });

  test('renderScenario and assertScenarioContract validate required testIDs, text, and forbidden states', async () => {
    registerCaseContract({
      caseId: 'CONTRACT-PASS',
      route: 'FoundationSmoke',
      sourceStatus: 'verified',
      requiredTestIds: ['screen.CONTRACT-PASS', 'anchor.box'],
      expectedTextByTestId: {
        'anchor.status': 'Sẵn sàng',
      },
      forbiddenTestIds: ['error.banner'],
    });
    expect(() =>
      registerCaseContract({
        caseId: 'CONTRACT-PASS',
        route: 'FoundationSmoke',
        sourceStatus: 'verified',
        requiredTestIds: [],
        expectedTextByTestId: {},
        forbiddenTestIds: [],
      }),
    ).toThrow(/Duplicate CaseContract/i);

    registerScenario({
      id: 'CONTRACT-PASS',
      route: 'FoundationSmoke',
      reset: () => undefined,
      expectedTestIds: ['screen.CONTRACT-PASS', 'anchor.box'],
      render: () =>
        React.createElement(
          View,
          { testID: 'screen.CONTRACT-PASS' },
          React.createElement(View, { testID: 'anchor.box' }),
          React.createElement(Text, { testID: 'anchor.status' }, 'Sẵn sàng'),
        ),
    });

    await renderScenario('CONTRACT-PASS');
    expect(getLastRenderedScenario().caseId).toBe('CONTRACT-PASS');
    await expect(assertScenarioContract('CONTRACT-PASS')).resolves.toBeUndefined();

    // Missing expected element must fail
    registerCaseContract({
      caseId: 'CONTRACT-FAIL-MISSING',
      route: 'FoundationSmoke',
      sourceStatus: 'verified',
      requiredTestIds: ['screen.CONTRACT-FAIL-MISSING', 'missing.element'],
      expectedTextByTestId: {},
      forbiddenTestIds: [],
    });

    registerScenario({
      id: 'CONTRACT-FAIL-MISSING',
      route: 'FoundationSmoke',
      reset: () => undefined,
      expectedTestIds: ['screen.CONTRACT-FAIL-MISSING', 'missing.element'],
    });

    // Asserting before rendering that specific scenario fails with mismatch
    await expect(assertScenarioContract('CONTRACT-FAIL-MISSING')).rejects.toThrow(/mismatch/i);

    await renderScenario('CONTRACT-FAIL-MISSING');
    await expect(assertScenarioContract('CONTRACT-FAIL-MISSING')).rejects.toThrow(
      /missing\.element/i,
    );

    // Wrong expected text must fail
    registerCaseContract({
      caseId: 'CONTRACT-FAIL-TEXT',
      route: 'FoundationSmoke',
      sourceStatus: 'verified',
      requiredTestIds: ['screen.CONTRACT-FAIL-TEXT'],
      expectedTextByTestId: {
        'screen.CONTRACT-FAIL-TEXT': 'Văn bản không tồn tại',
      },
      forbiddenTestIds: [],
    });
    registerScenario({
      id: 'CONTRACT-FAIL-TEXT',
      route: 'FoundationSmoke',
      reset: () => undefined,
      expectedTestIds: ['screen.CONTRACT-FAIL-TEXT'],
      render: () =>
        React.createElement(Text, { testID: 'screen.CONTRACT-FAIL-TEXT' }, 'Văn bản khác'),
    });
    await renderScenario('CONTRACT-FAIL-TEXT');
    await expect(assertScenarioContract('CONTRACT-FAIL-TEXT')).rejects.toThrow(/Expected text/i);

    // Forbidden element present must fail
    registerCaseContract({
      caseId: 'CONTRACT-FAIL-FORBIDDEN',
      route: 'FoundationSmoke',
      sourceStatus: 'verified',
      requiredTestIds: ['screen.CONTRACT-FAIL-FORBIDDEN'],
      expectedTextByTestId: {},
      forbiddenTestIds: ['forbidden.banner'],
    });

    registerScenario({
      id: 'CONTRACT-FAIL-FORBIDDEN',
      route: 'FoundationSmoke',
      reset: () => undefined,
      expectedTestIds: ['screen.CONTRACT-FAIL-FORBIDDEN'],
      render: () =>
        React.createElement(
          View,
          { testID: 'screen.CONTRACT-FAIL-FORBIDDEN' },
          React.createElement(View, { testID: 'forbidden.banner' }),
        ),
    });

    await renderScenario('CONTRACT-FAIL-FORBIDDEN');
    await expect(assertScenarioContract('CONTRACT-FAIL-FORBIDDEN')).rejects.toThrow(
      /forbidden\.banner/i,
    );

    // Quota-blocked / unreviewed case must fail
    registerCaseContract({
      caseId: 'CONTRACT-QUOTA-BLOCKED',
      route: 'CustomerAuth',
      sourceStatus: 'quota-blocked',
      requiredTestIds: ['screen.CONTRACT-QUOTA-BLOCKED'],
      expectedTextByTestId: {},
      forbiddenTestIds: [],
    });
    expect(getCaseContract('CONTRACT-QUOTA-BLOCKED').sourceStatus).toBe('quota-blocked');
    await expect(assertScenarioContract('CONTRACT-QUOTA-BLOCKED')).rejects.toThrow(
      /quota-blocked|unreviewed/i,
    );
  });

  test('nativeHarness blocks dev deep links in production mode and dispatches valid case links in dev mode', async () => {
    expect(
      parseHarnessDeepLink('bluemobile://debug/case/FOUNDATION-SMOKE', {
        isProduction: true,
      }),
    ).toEqual({
      allowed: false,
      reason: 'production-mode-blocked',
    });

    expect(
      await handleHarnessDeepLink('bluemobile://debug/case/FOUNDATION-SMOKE', {
        isProduction: true,
      }),
    ).toEqual({
      allowed: false,
      reason: 'production-mode-blocked',
    });

    expect(
      parseHarnessDeepLink('bluemobile://debug/case/FOUNDATION-SMOKE', {
        isProduction: false,
      }),
    ).toEqual({
      allowed: true,
      caseId: 'FOUNDATION-SMOKE',
    });

    expect(
      parseHarnessDeepLink('https://evil.example.com/case/FOUNDATION-SMOKE', {
        isProduction: false,
      }),
    ).toEqual({
      allowed: false,
      reason: 'invalid-scheme-or-path',
    });

    expect(
      parseHarnessDeepLink('bluemobile://debug/case/invalid_lowercase', {
        isProduction: false,
      }),
    ).toEqual({
      allowed: false,
      reason: 'missing-case-id',
    });

    registerScenario({
      id: 'FOUNDATION-SMOKE',
      route: 'FoundationSmoke',
      reset: () => undefined,
      expectedTestIds: ['screen.FOUNDATION-SMOKE', 'foundation.anchor', 'foundation.toggle'],
      render: () => React.createElement(FoundationBootstrapView),
    });

    const handled = await handleHarnessDeepLink('bluemobile://debug/case/FOUNDATION-SMOKE', {
      isProduction: false,
    });
    expect(handled).toEqual({ allowed: true, caseId: 'FOUNDATION-SMOKE' });
    expect(getActiveScenarioId()).toBe('FOUNDATION-SMOKE');
  });

  test('App and FoundationBootstrapView render anchor, official logo, and toggle status from Sẵn sàng to Đã chạm', async () => {
    function ConsumerProbe(): React.ReactElement {
      const deps = useAppDependencies();
      return React.createElement(
        Text,
        { testID: 'deps.kind' },
        `${deps.repository.kind}:${String(deps.initialized)}`,
      );
    }

    // F09 regression: Default <App /> without native documentDirectory must fail explicitly into app.init.error (no silent memory fallback)
    const uninjectedAppTree = render(React.createElement(App));
    await waitFor(() => {
      expect(uninjectedAppTree.getByTestId('app.init.error')).toBeTruthy();
    });
    expect(uninjectedAppTree.queryByTestId('screen.FOUNDATION-SMOKE')).toBeNull();

    // Explicitly injected in-memory repository mounts FoundationBootstrapView cleanly
    const injectedWorld = createTestWorld();
    const appTree = render(
      React.createElement(AppProviders, {
        repository: injectedWorld.repository,
        now: injectedWorld.clock.now,
        children: React.createElement(FoundationBootstrapView),
      }),
    );
    await waitFor(() => {
      expect(appTree.getByTestId('screen.FOUNDATION-SMOKE')).toBeTruthy();
    });
    expect(appTree.getByTestId('foundation.anchor')).toBeTruthy();
    expect(appTree.getByTestId('foundation.logo')).toBeTruthy();
    expect(appTree.getByText('Sẵn sàng')).toBeTruthy();

    fireEvent.press(appTree.getByTestId('foundation.toggle'));
    expect(appTree.getByText('Đã chạm')).toBeTruthy();

    expect(() => render(React.createElement(ConsumerProbe))).toThrow(/useAppDependencies/i);

    // F06-extended regression: AppProviders must NOT mount protected children when initialize() returns ok:false or rejects
    let shouldSucceedOnRetry = false;
    const failingRepo = {
      ...createTestWorld().repository,
      initialize: async () =>
        shouldSucceedOnRetry
          ? { ok: true as const, value: undefined }
          : {
              ok: false as const,
              code: 'validation' as const,
              message: 'demo-state-reset: corrupt snapshot',
            },
    };
    const failedProviderTree = render(
      React.createElement(AppProviders, {
        repository: failingRepo,
        children: React.createElement(View, { testID: 'protected.child' }),
      }),
    );
    await waitFor(() => {
      expect(failedProviderTree.getByTestId('app.init.error')).toBeTruthy();
    });
    expect(failedProviderTree.queryByTestId('protected.child')).toBeNull();

    shouldSucceedOnRetry = true;
    fireEvent.press(failedProviderTree.getByTestId('app.init.retry'));
    await waitFor(() => {
      expect(failedProviderTree.getByTestId('protected.child')).toBeTruthy();
    });

    // Rejecting initialize() promise also surfaces app.init.error without mounting protected children
    const rejectingRepo = {
      ...createTestWorld().repository,
      initialize: async () => {
        throw new Error('storage I/O crash');
      },
    };
    const rejectedProviderTree = render(
      React.createElement(AppProviders, {
        repository: rejectingRepo,
        children: React.createElement(View, { testID: 'protected.child.rejected' }),
      }),
    );
    await waitFor(() => {
      expect(rejectedProviderTree.getByTestId('app.init.error')).toBeTruthy();
    });
    expect(rejectedProviderTree.queryByTestId('protected.child.rejected')).toBeNull();
  });

  test('tokens match Figma 64:634 context and official logo asset matches verified SHA256 without temporary URLs', () => {
    expect(colors.background).toBe('#FFFFFF');
    expect(colors.textPrimary).toBe('#0B1F3A');
    expect(colors.textSecondary).toBe('#6C7D98');
    expect(colors.brandPrimary).toBe('#2C6BED');
    expect(colors.ctaPrimaryBg).toBe('#050608');
    expect(colors.guestButtonBg).toBe('#F1F5FB');
    expect(colors.borderSocial).toBe('#D3DCE9');
    expect(colors.borderInput).toBe('#8793A3');
    expect(typography.fontFamily.regular).toContain('Be Vietnam Pro');

    const logoPath = path.resolve(__dirname, '../../shared/assets/brand-blue-logo.png');
    expect(fs.existsSync(logoPath)).toBe(true);
    const logoBytes = fs.readFileSync(logoPath);
    const sha256 = crypto.createHash('sha256').update(logoBytes).digest('hex').toUpperCase();
    expect(sha256).toBe('2CAC4859C3DD975C669DEEC522E24F7DE74FFACBD0C973B8BF1DC938D35A3009');
  });

  test('CLI scripts reject unknown cases and detect negative-control faults in visual, layout, and a11y fixtures (Recipes 1.8 & 1.10)', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const tmpDir = path.join(
      rootDir,
      'artifacts',
      'agy',
      'plan01',
      'task01',
      'resume-01',
      'tmp-fixtures',
    );
    fs.mkdirSync(tmpDir, { recursive: true });

    // 1. Unknown case fails non-zero in run-case.mjs
    const unknownRun = spawnSync(
      process.execPath,
      [path.join(rootDir, 'scripts', 'run-case.mjs'), 'NON-EXISTENT-CASE'],
      { encoding: 'utf8' },
    );
    expect(unknownRun.status).not.toBe(0);
    expect(unknownRun.stderr).toMatch(/Unknown case ID/i);

    // 2. Visual comparator detects >2dp anchor offset fault (exits non-zero), then passes when fixed
    const visualFaultPath = path.join(tmpDir, 'visual-fault.json');
    fs.writeFileSync(
      visualFaultPath,
      JSON.stringify({
        reference: {
          sourceStatus: 'test-harness-derived',
          viewport: { width: 390, height: 844 },
        },
        geometry: {
          toleranceDp: 2,
          anchors: [{ id: 'foundation.anchor', x: 20, y: 20, width: 100, height: 50 }],
        },
        measured: {
          logicalCanvas: { width: 390, height: 844 },
          fontScale: 1,
          anchors: {
            'foundation.anchor': { x: 28, y: 20, width: 100, height: 50 },
          },
        },
      }),
      'utf8',
    );
    const visualFail = spawnSync(
      process.execPath,
      [path.join(rootDir, 'scripts', 'check-visual.mjs'), '--fixture', visualFaultPath],
      { encoding: 'utf8' },
    );
    expect(visualFail.status).not.toBe(0);
    expect(visualFail.stderr).toMatch(/anchor-offset-exceeded/i);

    const visualPassPath = path.join(tmpDir, 'visual-pass.json');
    fs.writeFileSync(
      visualPassPath,
      JSON.stringify({
        reference: {
          sourceStatus: 'test-harness-derived',
          viewport: { width: 390, height: 844 },
        },
        geometry: {
          toleranceDp: 2,
          anchors: [{ id: 'foundation.anchor', x: 20, y: 20, width: 100, height: 50 }],
        },
        measured: {
          logicalCanvas: { width: 390, height: 844 },
          fontScale: 1,
          anchors: {
            'foundation.anchor': { x: 20, y: 20, width: 100, height: 50 },
          },
        },
      }),
      'utf8',
    );
    const visualPass = spawnSync(
      process.execPath,
      [path.join(rootDir, 'scripts', 'check-visual.mjs'), '--fixture', visualPassPath],
      { encoding: 'utf8' },
    );
    expect(visualPass.status).toBe(0);

    // 3. Layout comparator detects sibling overlap fault (exits non-zero), then passes when fixed
    const layoutFaultPath = path.join(tmpDir, 'layout-fault.json');
    fs.writeFileSync(
      layoutFaultPath,
      JSON.stringify({
        profiles: [
          {
            name: 'w320-f2',
            viewportWidth: 320,
            viewportHeight: 844,
            elements: [
              { id: 'foundation.anchor', x: 20, y: 20, width: 100, height: 50 },
              { id: 'foundation.toggle', x: 60, y: 40, width: 120, height: 48 },
            ],
          },
        ],
      }),
      'utf8',
    );
    const layoutFail = spawnSync(
      process.execPath,
      [path.join(rootDir, 'scripts', 'check-layout.mjs'), '--fixture', layoutFaultPath],
      { encoding: 'utf8' },
    );
    expect(layoutFail.status).not.toBe(0);
    expect(layoutFail.stderr).toMatch(/sibling-overlap/i);

    const layoutPassPath = path.join(tmpDir, 'layout-pass.json');
    fs.writeFileSync(
      layoutPassPath,
      JSON.stringify({
        profiles: [
          {
            name: 'w320-f2',
            viewportWidth: 320,
            viewportHeight: 844,
            elements: [
              { id: 'foundation.anchor', x: 20, y: 20, width: 100, height: 50 },
              { id: 'foundation.toggle', x: 20, y: 90, width: 120, height: 48 },
            ],
          },
        ],
      }),
      'utf8',
    );
    const layoutPass = spawnSync(
      process.execPath,
      [path.join(rootDir, 'scripts', 'check-layout.mjs'), '--fixture', layoutPassPath],
      { encoding: 'utf8' },
    );
    expect(layoutPass.status).toBe(0);

    // 4. A11y comparator detects missing accessibilityLabel fault (exits non-zero), then passes when fixed
    const a11yFaultPath = path.join(tmpDir, 'a11y-fault.json');
    fs.writeFileSync(
      a11yFaultPath,
      JSON.stringify({
        talkBackServiceEnabled: false,
        talkBackVerified: false,
        keyboardFocusVerified: true,
        focusedNodeId: 'foundation.toggle',
        nodes: [
          {
            id: 'foundation.toggle',
            interactive: true,
            nativeClassName: 'android.widget.Button',
            observableRole: 'button',
            accessibilityLabel: '',
            width: 120,
            height: 48,
          },
        ],
      }),
      'utf8',
    );
    const a11yFail = spawnSync(
      process.execPath,
      [path.join(rootDir, 'scripts', 'check-a11y.mjs'), '--fixture', a11yFaultPath],
      { encoding: 'utf8' },
    );
    expect(a11yFail.status).not.toBe(0);
    expect(a11yFail.stderr).toMatch(/missing-accessibility-label/i);

    const a11yPassPath = path.join(tmpDir, 'a11y-pass.json');
    fs.writeFileSync(
      a11yPassPath,
      JSON.stringify({
        talkBackServiceEnabled: false,
        talkBackVerified: false,
        keyboardFocusVerified: true,
        focusedNodeId: 'foundation.toggle',
        nodes: [
          {
            id: 'foundation.toggle',
            interactive: true,
            nativeClassName: 'android.widget.Button',
            observableRole: 'button',
            accessibilityLabel: 'Kiểm tra',
            width: 120,
            height: 48,
          },
        ],
      }),
      'utf8',
    );
    const a11yPass = spawnSync(
      process.execPath,
      [path.join(rootDir, 'scripts', 'check-a11y.mjs'), '--fixture', a11yPassPath],
      { encoding: 'utf8' },
    );
    expect(a11yPass.status).toBe(0);
  });
});
