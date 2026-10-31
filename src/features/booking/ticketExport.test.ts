import { saveTicketImage } from './ticketExport';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library/legacy';
import type { View } from 'react-native';
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn().mockResolvedValue('file:///ticket.png'),
  releaseCapture: jest.fn(),
}));
jest.mock('expo-media-library/legacy', () => ({
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
}));
test('saves captured PNG then releases temporary image', async () => {
  const ref = { current: {} as View };
  await saveTicketImage(ref);
  expect(captureRef).toHaveBeenCalledWith(ref, expect.objectContaining({ format: 'png' }));
  expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///ticket.png');
  expect(releaseCapture).toHaveBeenCalledWith('file:///ticket.png');
});
test('save errors propagate and temporary image is still released', async () => {
  jest.mocked(MediaLibrary.saveToLibraryAsync).mockRejectedValueOnce(new Error('disk'));
  await expect(saveTicketImage({ current: {} as View })).rejects.toThrow('disk');
  expect(releaseCapture).toHaveBeenCalled();
});
