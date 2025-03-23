import { InputHTMLAttributes, forwardRef } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface LabeledInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  fullWidth?: boolean;
  error?: string;
}

const LabeledInput = forwardRef<HTMLInputElement, LabeledInputProps>(
  ({ label, fullWidth, className, id, error, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className={cn("space-y-2", fullWidth ? "w-full" : "", className)}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <Input 
          ref={ref} 
          id={inputId} 
          className={cn(error ? "border-red-500" : "", fullWidth ? "w-full" : "")} 
          {...props} 
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

LabeledInput.displayName = "LabeledInput";

export { LabeledInput }; 