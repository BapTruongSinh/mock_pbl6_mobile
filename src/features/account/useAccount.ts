import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppDependencies } from '../../app/providers/AppProviders';
import { useSession } from '../auth/useSession';
import type { AccountProfile } from '../../repositories/contracts/TravelRepository';
import type { AppNoticeValue } from '../../shared/components/AppNotice';

export interface AccountController {
  session: import('../../domain/types').Session | null;
  profile: AccountProfile | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  notice: AppNoticeValue | null;
  setNotice: (notice: AppNoticeValue | null) => void;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  setCurrentPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  changeAvatar: () => Promise<void>;
  changePassword: () => Promise<void>;
  updateProfile: (input: { email?: string; phone?: string; dateOfBirth?: string }) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}
export function useAccount(): AccountController {
  const { repository } = useAppDependencies();
  const { session, logout } = useSession();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<AppNoticeValue | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setProfile(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    if (!session) return;
    setLoading(true);
    void repository
      .getAccountProfile(session)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setProfile(result.value);
          setError(null);
        } else setError(result.message);
      })
      .catch(() => {
        if (active) setError('Không tải được thông tin. Vui lòng thử lại.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository, session, reload]);
  const fail = (message: string): void =>
    setNotice({ title: 'Chưa thể thực hiện', message, variant: 'error' });
  const changeAvatar = async (): Promise<void> => {
    if (!session || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    let newUri: string | null = null;
    try {
      // Android system photo picker grants only the selected image; no broad library permission.
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      const asset = picked.canceled ? undefined : picked.assets[0];
      if (!asset) return;
      if (!FileSystem.documentDirectory) throw new Error('Không mở được bộ nhớ ứng dụng');
      const directory = `${FileSystem.documentDirectory}avatars/`;
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      newUri = `${directory}${session.accountId}-${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: asset.uri, to: newUri });
      const result = await repository.updateAccountAvatar(session, newUri);
      if (!result.ok) throw new Error(result.message);
      const oldUri = profile?.avatarUri;
      setProfile(result.value);
      newUri = null;
      if (oldUri?.startsWith(directory))
        await FileSystem.deleteAsync(oldUri, { idempotent: true }).catch(() => undefined);
      setNotice({
        title: 'Đã đổi ảnh đại diện',
        message: 'Ảnh mới đã được lưu vào tài khoản của bạn.',
        variant: 'success',
      });
    } catch {
      fail('Không thể lưu ảnh đại diện. Vui lòng chọn lại ảnh.');
    } finally {
      if (newUri) await FileSystem.deleteAsync(newUri, { idempotent: true }).catch(() => undefined);
      busyRef.current = false;
      setBusy(false);
    }
  };
  const changePassword = async (): Promise<void> => {
    if (!session || busyRef.current) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      fail('Vui lòng nhập đầy đủ ba ô mật khẩu.');
      return;
    }
    if (newPassword !== confirmPassword) {
      fail('Mật khẩu xác nhận chưa khớp với mật khẩu mới.');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await repository.changePassword(session, currentPassword, newPassword);
      if (!result.ok) {
        fail(result.message);
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({
        title: 'Đổi mật khẩu thành công',
        message: 'Lần đăng nhập tiếp theo, hãy dùng mật khẩu mới của bạn.',
        variant: 'success',
      });
    } catch {
      fail('Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const updateProfile: AccountController['updateProfile'] = async (input) => {
    if (!session || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await repository.updateAccountProfile(session, input);
      if (!result.ok) {
        fail(result.message);
        return;
      }
      setProfile(result.value);
      setNotice({
        title: 'Đã lưu thông tin',
        message: 'Thông tin tài khoản đã được cập nhật.',
        variant: 'success',
      });
    } catch {
      fail('Không lưu được thông tin. Vui lòng thử lại.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return {
    updateProfile,
    session,
    profile,
    loading,
    busy,
    error,
    notice,
    setNotice,
    currentPassword,
    newPassword,
    confirmPassword,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    changeAvatar,
    changePassword,
    logout,
    retry: () => setReload((value) => value + 1),
  };
}
