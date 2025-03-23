import { TextareaHTMLAttributes, forwardRef } from "react";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface LabeledTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  fullWidth?: boolean;
  error?: string;
}

const LabeledTextarea = forwardRef<HTMLTextAreaElement, LabeledTextareaProps>(
  ({ label, fullWidth, className, id, error, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className={cn("space-y-2", fullWidth ? "w-full" : "", className)}>
        {label && <Label htmlFor={textareaId}>{label}</Label>}
        <Textarea 
          ref={ref} 
          id={textareaId} 
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

LabeledTextarea.displayName = "LabeledTextarea";

export { LabeledTextarea }; 