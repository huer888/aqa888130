import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-10 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Something went wrong</h1>
          <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full overflow-auto border border-gray-700">
            <h2 className="text-xl font-bold mb-2">Error:</h2>
            <pre className="text-red-300 font-mono mb-4 whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
            
            <h2 className="text-xl font-bold mb-2">Stack Trace:</h2>
            <pre className="text-gray-400 font-mono text-xs whitespace-pre-wrap">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold"
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
