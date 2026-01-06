import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function LoadingSpinner({ 
  className, 
  message = "Carregando...", 
  size = "md",
  ...props 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-4",
    lg: "h-12 w-12 border-4",
    xl: "h-16 w-16 border-4"
  };

  return (
    <div 
      className={cn("flex flex-col items-center justify-center py-8", className)} 
      {...props}
    >
      <div 
        className={cn(
          "animate-spin rounded-full border-gray-200 border-t-blue-600", 
          sizeClasses[size]
        )} 
      />
      {message && (
        <p className="mt-4 text-gray-600 font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
