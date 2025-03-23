import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  count?: number;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  className?: string;
}

export function Rating({ 
  value, 
  onChange, 
  count = 10, 
  size = "md", 
  editable = true,
  className 
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  
  const handleClick = (i: number) => {
    if (editable && onChange) {
      onChange(i + 1);
    }
  };
  
  const handleMouseEnter = (i: number) => {
    if (editable) {
      setHoverValue(i + 1);
    }
  };
  
  const handleMouseLeave = () => {
    if (editable) {
      setHoverValue(null);
    }
  };
  
  const getIconSize = () => {
    switch (size) {
      case "sm": return 16;
      case "md": return 20;
      case "lg": return 24;
      default: return 20;
    }
  };
  
  const iconSize = getIconSize();
  
  const stars = Array.from({ length: count }, (_, i) => {
    const selected = (hoverValue !== null ? i < hoverValue : i < value);
    
    return (
      <Star
        key={i}
        size={iconSize}
        className={cn(
          "cursor-pointer transition-all",
          selected ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-transparent",
          !editable && "cursor-default"
        )}
        onClick={() => handleClick(i)}
        onMouseEnter={() => handleMouseEnter(i)}
        onMouseLeave={handleMouseLeave}
      />
    );
  });
  
  return (
    <div className={cn("flex gap-1", className)}>
      {stars}
    </div>
  );
} 