"use client";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin">
        <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
      </div>
      <span className="ml-4 text-gray-600">Analyzing code...</span>
    </div>
  );
}
