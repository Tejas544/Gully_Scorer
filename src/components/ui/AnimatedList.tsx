'use client';
import { motion } from 'framer-motion';
import React from 'react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

// FIX: Changed type from React.ReactNode[] to React.ReactNode
export default function AnimatedList({ children, className }: { children: React.ReactNode, className?: string }) {
  
  // Safe conversion: This turns a single child OR multiple children into an array
  const childrenArray = React.Children.toArray(children);

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {childrenArray.map((child, i) => (
        <motion.div key={i} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}