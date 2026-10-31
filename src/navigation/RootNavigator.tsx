import { DriverScreen } from '../features/driver/DriverScreen';
import { AccountScreen } from '../features/account/AccountScreen';
import React, { useCallback, useEffect, useRef } from 'react';
import { BookingFlowScreen } from '../features/booking/BookingFlowScreen';
import { MyDemoTicketsScreen } from '../features/booking/MyDemoTicketsScreen';
import { SearchResultsScreen } from '../features/search/SearchResultsScreen';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSession } from '../features/auth/useSession';
import { CustomerHomeScreen } from '../features/home/CustomerHomeScreen';
import { WelcomeScreen } from '../features/auth/WelcomeScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { useIsFocused } from '@react-navigation/native';
import { GuestScanScreen } from '../features/guest/GuestScanScreen';
import { GuestMenuScreen } from '../features/guest/GuestMenuScreen';
import { GuestTicketLookupScreen } from '../features/guest/GuestTicketLookupScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { resolveEntry } from './guards';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type LoginNavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

function LoginRoute({ navigation }: { navigation: LoginNavProp }): React.ReactElement {
  return (
    <LoginScreen
      onNavigateToRegister={() => navigation.navigate('Register')}
      onNavigateToGuest={() => navigation.navigate('GuestMenu')}
      onLoginSuccess={(role) =>
        navigation.reset({
          index: 0,
          routes: [{ name: role === 'customer' ? 'CustomerHome' : 'DriverTrips' }],
        })
      }
    />
  );
}

function GuestScanRoute({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GuestScan'>;
}): React.ReactElement {
  const focused = useIsFocused();
  return <GuestScanScreen isActive={focused} onBack={() => navigation.goBack()} />;
}

export function RootNavigator(): React.ReactElement {
  const { session } = useSession();
  const entry = resolveEntry(session);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const previousEntry = useRef(entry);
  const synchronizeRole = useCallback((): void => {
    if (!navigationRef.isReady()) return;
    const previous = previousEntry.current;
    previousEntry.current = entry;
    const current = navigationRef.getCurrentRoute()?.name;
    if (entry === 'Driver' && current !== 'DriverTrips')
      navigationRef.resetRoot({ index: 0, routes: [{ name: 'DriverTrips' }] });
    else if (
      entry === 'Customer' &&
      ((previous === 'Driver' && current !== 'DriverTrips') ||
        current === 'Welcome' ||
        current === 'Login')
    )
      navigationRef.resetRoot({ index: 0, routes: [{ name: 'CustomerHome' }] });
    else if (entry === 'Guest' && previous !== 'Guest' && current !== 'DriverTrips')
      navigationRef.resetRoot({ index: 0, routes: [{ name: 'Login' }] });
  }, [entry, navigationRef]);
  useEffect(synchronizeRole, [synchronizeRole]);

  return (
    <NavigationContainer ref={navigationRef} onReady={synchronizeRole}>
      <Stack.Navigator
        initialRouteName={
          entry === 'Customer' ? 'CustomerHome' : entry === 'Driver' ? 'DriverTrips' : 'Welcome'
        }
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome">
          {({ navigation }) => <WelcomeScreen onStart={() => navigation.navigate('Login')} />}
        </Stack.Screen>
        <Stack.Screen name="Login" component={LoginRoute} />
        <Stack.Screen name="Register">
          {({ navigation }) => (
            <RegisterScreen onNavigateToLogin={() => navigation.navigate('Login')} />
          )}
        </Stack.Screen>
        <Stack.Screen name="GuestMenu">
          {({ navigation }) => (
            <GuestMenuScreen
              onLookup={() => navigation.navigate('GuestTicketLookup')}
              onViewTrips={() => navigation.navigate('SearchResults')}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="GuestTicketLookup">
          {({ navigation }) => (
            <GuestTicketLookupScreen
              onBack={() => navigation.goBack()}
              onScanQr={() => navigation.navigate('GuestScan')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="GuestScan" component={GuestScanRoute} />
        <Stack.Screen name="CustomerHome">
          {({ navigation }) => (
            <CustomerHomeScreen
              onSearch={() => navigation.navigate('SearchResults')}
              onTickets={() => navigation.navigate('DemoTickets')}
              onAccount={() => navigation.navigate('CustomerAccount')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="SearchResults">
          {({ navigation }) => (
            <SearchResultsScreen
              onBack={() => navigation.goBack()}
              onHome={() =>
                session?.role === 'customer'
                  ? navigation.navigate('CustomerHome')
                  : navigation.navigate('GuestMenu')
              }
              onTickets={() => navigation.navigate('DemoTickets')}
              onAccount={() => navigation.navigate('CustomerAccount')}
              onSelectTrip={(tripId) => navigation.navigate('BookingFlow', { tripId })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="BookingFlow">
          {({ navigation, route }) => (
            <BookingFlowScreen
              tripId={route.params.tripId}
              onBack={() => navigation.goBack()}
              onNavigate={(tab) =>
                tab === 'home'
                  ? navigation.navigate('CustomerHome')
                  : tab === 'search'
                    ? navigation.navigate('SearchResults')
                    : tab === 'tickets'
                      ? navigation.navigate('DemoTickets')
                      : navigation.navigate('CustomerAccount')
              }
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="DemoTickets">
          {({ navigation }) => (
            <MyDemoTicketsScreen
              onLogin={() => navigation.navigate('Login')}
              onNavigate={(tab) =>
                tab === 'home'
                  ? navigation.navigate('CustomerHome')
                  : tab === 'search'
                    ? navigation.navigate('SearchResults')
                    : tab === 'account'
                      ? navigation.navigate('CustomerAccount')
                      : undefined
              }
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="CustomerAccount">
          {({ navigation }) => (
            <AccountScreen
              onLogin={() => navigation.navigate('Login')}
              onLogout={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
              onNavigate={(tab) => {
                if (tab === 'home') navigation.navigate('CustomerHome');
                else if (tab === 'search') navigation.navigate('SearchResults');
                else if (tab === 'tickets') navigation.navigate('DemoTickets');
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="DriverTrips">
          {({ navigation }) => (
            <DriverScreen
              onLogout={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
