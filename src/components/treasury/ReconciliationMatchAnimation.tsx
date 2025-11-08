import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export const ReconciliationMatchAnimation = () => {
  useEffect(() => {
    // Simple confetti effect using CSS animations
    const confettiColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti-piece";
      confetti.style.left = Math.random() * 100 + "vw";
      confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + "s";
      document.body.appendChild(confetti);

      setTimeout(() => confetti.remove(), 3000);
    }
  }, []);

  return (
    <>
      <style>
        {`
          @keyframes confetti-fall {
            0% {
              transform: translateY(-100vh) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }

          .confetti-piece {
            position: fixed;
            width: 10px;
            height: 10px;
            top: -10px;
            z-index: 9999;
            animation: confetti-fall 3s linear forwards;
          }

          @keyframes success-scale {
            0% {
              transform: scale(0.5);
              opacity: 0;
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          @keyframes success-fade {
            0%, 70% {
              opacity: 1;
            }
            100% {
              opacity: 0;
            }
          }
        `}
      </style>

      <div
        className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
        style={{
          animation: "success-fade 2s ease-out forwards",
        }}
      >
        <div
          className="bg-card rounded-full p-8 shadow-2xl border-4 border-green-500"
          style={{
            animation: "success-scale 0.5s ease-out",
          }}
        >
          <CheckCircle2 className="h-24 w-24 text-green-500" />
        </div>
      </div>
    </>
  );
};
