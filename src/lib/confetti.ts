import confetti from "canvas-confetti";

export function fireBrandConfetti() {
  const brandColors = ["#6B2D8F", "#4A66B0", "#F59E0B", "#A182D2", "#22C55E"];

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: brandColors,
    disableForReducedMotion: true,
  });

  // Secondary burst for rich festive feel
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: brandColors,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: brandColors,
    });
  }, 250);
}

export function fireSmallConfetti() {
  confetti({
    particleCount: 40,
    spread: 50,
    origin: { y: 0.7 },
    colors: ["#6B2D8F", "#4A66B0", "#F59E0B"],
    disableForReducedMotion: true,
  });
}
