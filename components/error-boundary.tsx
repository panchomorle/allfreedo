"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <h2 className="text-red-800 font-semibold">Something went wrong</h2>
          <p className="text-red-600 text-sm mt-1">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
