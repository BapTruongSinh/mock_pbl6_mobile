import { driverActionAssets } from './driverActionAssets';
import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { AccountScreen } from '../account/AccountScreen';
import { typography } from '../../shared/theme/tokens';
export function DriverAccountScreen({
  onNavigate,
  onLogout,
}: {
  onNavigate: (tab: 'home' | 'route' | 'account') => void;
  onLogout: () => void;
}): React.ReactElement {
  return (
    <AccountScreen
      onNavigate={() => undefined}
      onLogin={onLogout}
      onLogout={onLogout}
      bottomNavigation={
        <View style={s.nav}>
          {(['home', 'route', 'account'] as const).map((tab, i) => (
            <Pressable
              key={tab}
              testID={'driver.account.tab.' + tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'account' }}
              style={s.tab}
              onPress={() => onNavigate(tab)}
            >
              <Image
                source={
                  driverActionAssets['1146:1196']?.[
                    ['imgIconHome', 'imgIconRoute', 'imgIconUser1'][i] ?? 'imgIconUser1'
                  ]
                }
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
              <Text style={[s.label, tab === 'account' && s.active]}>
                {['Hôm nay', 'Lộ trình', 'Tài khoản'][i]}
              </Text>
            </Pressable>
          ))}
        </View>
      }
    />
  );
}
const s = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 8,
    flexShrink: 0,
    boxShadow: '0px 3px 9px rgba(18,36,74,.08)',
  },
  tab: { flex: 1, minHeight: 64, justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: '#7487A3' },
  active: { fontFamily: typography.fontFamily.semiBold, color: '#2166F3' },
});
