import { Platform } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library/legacy';
import type { RefObject } from 'react';
import type { View } from 'react-native';
export async function saveTicketImage(ref: RefObject<View | null>): Promise<void> {
  if (!ref.current) throw new Error('Vé chưa sẵn sàng. Vui lòng thử lại.');
  if (Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) < 29)) {
    const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
    if (!permission.granted)
      throw new Error('Chưa có quyền lưu ảnh. Bạn có thể bật quyền trong Cài đặt.');
  }
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  try {
    await MediaLibrary.saveToLibraryAsync(uri);
  } finally {
    releaseCapture(uri);
  }
}
