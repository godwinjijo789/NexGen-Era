export const extractJoinPinFromUrl = (value?: string): string => {
  if (!value) return '';

  try {
    const url = new URL(value, 'http://localhost');
    const pin = url.searchParams.get('join');
    return (pin || '').replace(/\D/g, '').slice(0, 6);
  } catch {
    const match = String(value).match(/[?&]join=([^&]+)/i);
    const pin = match?.[1] ?? '';
    return pin.replace(/\D/g, '').slice(0, 6);
  }
};

export const buildJoinLink = (pin: string, baseUrl?: string): string => {
  const safePin = String(pin ?? '').replace(/\D/g, '').slice(0, 6);
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const params = new URLSearchParams({ join: safePin });
  return `${origin}?${params.toString()}`;
};

export const buildQrCodeUrl = (joinLink: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(joinLink)}`;
};
