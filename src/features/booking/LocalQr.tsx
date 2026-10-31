import React, { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import qrcode from 'qrcode-generator';
export function LocalQr({
  payload,
  size = 180,
}: {
  payload: string;
  size?: number;
}): React.ReactElement {
  const xml = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true });
  }, [payload]);
  return <SvgXml xml={xml} width={size} height={size} accessibilityLabel="Mã QR mô phỏng" />;
}
