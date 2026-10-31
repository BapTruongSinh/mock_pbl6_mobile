import React from 'react';
import { Image, Pressable, Text } from 'react-native';
import { driverManifestAssets } from './driverManifestAssets';
import { manifestStyles as m } from './driverManifest.styles';
export function ManifestAsset({
  node,
  name,
  size = 18,
  height = size,
}: {
  node: string;
  name: string;
  size?: number;
  height?: number;
}): React.ReactElement {
  return (
    <Image
      source={driverManifestAssets[node]?.[name]}
      resizeMode="contain"
      style={{ width: size, height }}
    />
  );
}
export function ManifestAction({
  label,
  onPress,
  primary = false,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  testID?: string;
}): React.ReactElement {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[m.button, primary && m.primary, disabled && m.disabled]}
    >
      <Text style={[m.buttonText, primary && m.white]}>{label}</Text>
    </Pressable>
  );
}
