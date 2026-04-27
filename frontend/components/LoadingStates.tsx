import React from "react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  size = "md",
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const container = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <div className="h-full w-full border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
      </div>
      {message && <p className="text-gray-600">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        {container}
      </div>
    );
  }

  return container;
};

interface ErrorDisplayProps {
  error: Error | string | null;
  title?: string;
  onDismiss?: () => void;
  variant?: "inline" | "card" | "toast";
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = "An error occurred",
  onDismiss,
  variant = "card",
}) => {
  if (!error) return null;

  const message = typeof error === "string" ? error : error.message;

  if (variant === "inline") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  if (variant === "toast") {
    return (
      <div className="fixed bottom-4 right-4 max-w-md p-4 bg-red-600 text-white rounded-lg shadow-lg flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm mt-1">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-200 hover:text-white transition"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // card variant
  return (
    <div className="p-4 bg-white border border-red-200 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-red-600 text-xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-800">{title}</h3>
          <p className="text-sm text-red-700 mt-1">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

interface SkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  count = 1,
  height = "h-4",
  className = "",
}) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gray-200 rounded animate-pulse ${className}`}
        />
      ))}
    </div>
  );
};
