/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { typography } from '../theme/tokens';
export type CustomerTab = 'home' | 'search' | 'tickets' | 'account';
const icons = {
  home: require('../assets/search/home.svg') as number,
  search: require('../assets/home/search.svg') as number,
  tickets: require('../assets/search/ticket.svg') as number,
  account: require('../assets/search/account.svg') as number,
};
const activeIcons = {
  home: require('../assets/home/home.svg') as number,
  search: require('../assets/search/search.svg') as number,
  tickets: require('../assets/booking/31-183-icon-ticket.svg') as number,
  account: icons.account,
};
export function CustomerBottomNav({
  active,
  onNavigate,
}: {
  active: CustomerTab;
  onNavigate?: (tab: CustomerTab) => void;
}): React.ReactElement {
  return (
    <View style={styles.nav}>
      {(['home', 'search', 'tickets', 'account'] as const).map((key, i) => (
        <Pressable
          key={key}
          testID={`customer.tab.${key}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: key === active }}
          accessibilityLabel={['Trang chủ', 'Tìm kiếm', 'Vé', 'Tài khoản'][i]}
          style={styles.item}
          onPress={() =>
            onNavigate ? onNavigate(key) : Alert.alert('Thông báo', 'Màn hình này sẽ được bổ sung.')
          }
        >
          <View style={[styles.icon, key === active && styles.active]}>
            <SvgUri
              uri={Image.resolveAssetSource(key === active ? activeIcons[key] : icons[key]).uri}
              width={key === active ? 18 : 20}
              height={key === active ? 18 : 20}
            />
          </View>
          <Text style={[styles.text, key === active && styles.activeText]}>
            {['Trang chủ', 'Tìm kiếm', 'Vé', 'Tài khoản'][i]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  nav: {
    flexShrink: 0,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginVertical: 8,
    boxShadow: '0px -3px 18px rgba(8,31,64,0.10)',
  },
  item: { flex: 1, alignItems: 'center', gap: 6, minHeight: 50 },
  icon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  active: { backgroundColor: '#246BEB' },
  text: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 8,
    color: '#8491A7',
    textAlign: 'center',
  },
  activeText: { fontFamily: typography.fontFamily.semiBold, color: '#246BEB' },
});
