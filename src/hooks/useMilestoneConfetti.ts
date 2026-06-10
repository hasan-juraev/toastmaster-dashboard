import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

function isMilestone(n: number) {
  return n > 0 && n % 100 === 0;
}

function fireCelebration() {
  const burst = (angle: number, origin: { x: number; y: number }) =>
    confetti({
      particleCount: 80,
      angle,
      spread: 55,
      origin,
      colors: ["#3B82F6", "#60A5FA", "#FBBF24", "#34D399", "#F87171"],
      zIndex: 9999,
    });

  burst(60, { x: 0, y: 0.65 });
  burst(120, { x: 1, y: 0.65 });

  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 90,
      origin: { x: 0.5, y: 0.5 },
      colors: ["#3B82F6", "#FBBF24", "#34D399"],
      zIndex: 9999,
    });
  }, 250);
}

export function useMilestoneConfetti(total: number) {
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!isMilestone(total)) return;
    if (firedFor.current === total) return;
    firedFor.current = total;
    fireCelebration();
  }, [total]);
}
