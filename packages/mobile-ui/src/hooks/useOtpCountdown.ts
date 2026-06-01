import { useEffect, useState } from 'react';

export function useOtpCountdown(initialSeconds = 90) {
  const [seconds, setSeconds] = useState(0);
  const [canResend, setCanResend] = useState(true);

  function start() {
    setSeconds(initialSeconds);
    setCanResend(false);
  }

  useEffect(() => {
    if (seconds <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return { seconds, canResend, start };
}
