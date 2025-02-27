
import React from 'react';

export function ChatLoader() {
  return (
    <div className="flex items-center space-x-2 p-4 max-w-[80%] rounded-lg bg-secondary/50">
      <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></div>
      <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse delay-75"></div>
      <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse delay-150"></div>
      <span className="text-sm text-muted-foreground">AI is thinking...</span>
    </div>
  );
}
