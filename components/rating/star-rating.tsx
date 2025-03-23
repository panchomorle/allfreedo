"use client";

import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  size = "md",
  disabled = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };
  
  const handleMouseEnter = (rating: number) => {
    if (disabled) return;
    setHoverValue(rating);
  };
  
  const handleMouseLeave = () => {
    if (disabled) return;
    setHoverValue(null);
  };
  
  const handleClick = (rating: number) => {
    if (disabled || !onChange) return;
    onChange(rating);
  };
  
  const renderStar = (index: number) => {
    const rating = index + 1;
    const isActive = (hoverValue !== null ? hoverValue : value) !== null && 
                     (hoverValue !== null ? hoverValue : value || 0) >= rating;
                     
    return (
      <Star
        key={index}
        className={cn(
          sizeClass[size],
          "cursor-pointer transition-colors",
          isActive ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
          disabled && "cursor-default opacity-70",
          className
        )}
        onMouseEnter={() => handleMouseEnter(rating)}
        onMouseLeave={handleMouseLeave}
        onClick={() => handleClick(rating)}
      />
    );
  };
  
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, index) => renderStar(index))}
    </div>
  );
} 