import { SEARCH_TRIPS } from '../search/searchModel';
import React, { useEffect, useReducer, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginScreen } from '../auth/LoginScreen';
import { useSession } from '../auth/useSession';
import { CustomerBottomNav, type CustomerTab } from '../../shared/components/CustomerBottomNav';
import {
  bookingReducer,
  INITIAL_BOOKING,
  validatePassengers,
  type BookingStage,
  type BookingState,
} from './bookingModel';
import { saveDemoTicket } from './demoTicketRepository';
import { bookingStyles as s } from './booking.styles';
import { bookingAssets as a } from './bookingAssets';
import { BookingBackground, BookingHeader } from './BookingShared';
import { SeatMapScreen } from './SeatMapScreen';
import { PassengerScreen } from './PassengerScreen';
import { PaymentScreen } from './PaymentScreen';
import { TicketScreen } from './TicketScreen';
export function BookingFlowScreen({
  onBack,
  onNavigate,
  reviewStage,
  tripId,
}: {
  onBack: () => void;
  onNavigate?: (tab: CustomerTab) => void;
  reviewStage?: BookingStage;
  tripId?: string;
}): React.ReactElement {
  const { session } = useSession();
  const [now, setNow] = useState(Date.now);
  const [state, dispatch] = useReducer(bookingReducer, undefined, (): BookingState =>
    reviewStage
      ? {
          ...INITIAL_BOOKING,
          trip: SEARCH_TRIPS.find((t) => t.id === tripId),
          pickup: SEARCH_TRIPS.find((t) => t.id === tripId)?.pickup ?? INITIAL_BOOKING.pickup,
          dropoff: SEARCH_TRIPS.find((t) => t.id === tripId)?.dropoff ?? INITIAL_BOOKING.dropoff,
          stage: reviewStage,
          seats: tripId && tripId !== 'NK118' ? [] : ['B01', 'B02'],
          expiresAt: Date.now() + 600000,
          passengers: {
            B01: { fullName: 'Nguyễn Minh Anh', phone: '0900000218' },
            B02: { fullName: 'Trần Gia Huy', phone: '0900000762' },
          },
        }
      : { ...INITIAL_BOOKING, trip: SEARCH_TRIPS.find((t) => t.id === tripId) },
  );
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (state.stage === 'ticket' && session?.role === 'customer' && !reviewStage)
      saveDemoTicket(session.accountId, state, now);
  }, [state, session, reviewStage, now]);
  function back(): void {
    if (state.stage === 'ticket') {
      if (onNavigate) onNavigate('tickets');
      else onBack();
      return;
    }
    if (state.stage === 'seats') {
      onBack();
      return;
    }
    dispatch({
      type: 'stage',
      stage:
        state.stage === 'passengers' || state.stage === 'login'
          ? 'seats'
          : state.stage === 'qr'
            ? 'passengers'
            : 'qr',
    });
  }
  function continuePassengers(): void {
    const error = validatePassengers(state.seats, state.passengers);
    if (error) {
      dispatch({ type: 'error', message: error });
      return;
    }
    if (!state.expiresAt || Date.now() >= state.expiresAt) {
      dispatch({ type: 'error', message: 'Thời gian giữ ghế đã hết. Vui lòng chọn lại.' });
      return;
    }
    if (!reviewStage && session?.role !== 'customer') {
      dispatch({ type: 'stage', stage: 'login' });
      return;
    }
    dispatch({ type: 'stage', stage: 'qr' });
  }
  if (state.stage === 'login')
    return (
      <View style={{ flex: 1 }}>
        <LoginScreen
          onLoginSuccess={(role) =>
            role === 'customer'
              ? dispatch({ type: 'continue', authenticated: true, now: Date.now() })
              : dispatch({
                  type: 'error',
                  message: 'Vui lòng dùng tài khoản khách hàng để đặt vé.',
                })
          }
        />
        {state.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {state.error}
          </Text>
        )}
      </View>
    );
  return (
    <View style={s.root}>
      {state.stage !== 'seats' && <BookingBackground />}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.content}>
          <BookingHeader
            title={
              state.stage === 'seats'
                ? 'Chọn ghế'
                : state.stage === 'passengers'
                  ? 'Hành khách'
                  : state.stage === 'ticket'
                    ? 'Vé điện tử'
                    : 'Thanh toán'
            }
            onBack={back}
            blue={state.stage !== 'seats'}
            status={
              state.stage === 'ticket'
                ? a.ticketCheck
                : state.stage === 'passengers'
                  ? undefined
                  : a.shield
            }
          />
          {state.stage === 'seats' ? (
            <SeatMapScreen
              state={state}
              dispatch={dispatch}
              now={now}
              onContinue={() =>
                dispatch({
                  type: 'continue',
                  authenticated: !!reviewStage || session?.role === 'customer',
                  now: Date.now(),
                })
              }
            />
          ) : state.stage === 'passengers' ? (
            <PassengerScreen
              state={state}
              dispatch={dispatch}
              now={now}
              onContinue={continuePassengers}
            />
          ) : state.stage === 'ticket' ? (
            <TicketScreen state={state} onReturnToList={() => onNavigate?.('tickets')} />
          ) : (
            <PaymentScreen
              state={state}
              now={now}
              onReported={() => dispatch({ type: 'reported-transfer' })}
              onConfirmed={() => dispatch({ type: 'confirmed', now: Date.now() })}
              onBackToQr={() => dispatch({ type: 'stage', stage: 'qr' })}
            />
          )}
          {state.stage === 'ticket' && (
            <View style={s.footerNav}>
              <CustomerBottomNav active="tickets" onNavigate={onNavigate} />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
