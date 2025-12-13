'use client';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

export default function Celebration({ active }: { active: boolean }) {
  const { width, height } = useWindowSize();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2800);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <Confetti
        width={width}
        height={height}
        numberOfPieces={500}
        recycle={true}
        gravity={0.2}
      />
    </div>
  );
}