import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Ops! Algo deu errado.</h1>
          <div className="bg-gray-800 p-4 rounded overflow-auto max-w-full w-full border border-gray-700">
            <p className="font-mono text-sm text-red-300">{this.state.error?.toString()}</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-6 bg-green-500 text-black px-6 py-2 rounded font-bold"
          >
            Recarregar Página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
