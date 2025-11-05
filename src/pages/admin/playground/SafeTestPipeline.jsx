import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 min-h-screen">
          <div className="bg-white border border-red-200 rounded-lg p-6 max-w-4xl">
            <h1 className="text-2xl font-bold text-red-800 mb-4">❌ Erreur détectée dans Pipeline</h1>
            
            <div className="bg-red-100 p-4 rounded mb-4">
              <h3 className="font-bold text-red-800">Erreur:</h3>
              <p className="text-red-700">{this.state.error && this.state.error.toString()}</p>
            </div>

            <div className="bg-gray-100 p-4 rounded mb-4">
              <h3 className="font-bold text-gray-800">Stack trace:</h3>
              <pre className="text-xs text-gray-600 overflow-auto">
                {this.state.errorInfo.componentStack}
              </pre>
            </div>

            <button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const UltraSimplePipeline = () => {
  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          🔍 Test Ultra Simple
        </h1>
        <p className="text-gray-600 mb-4">
          Si vous voyez ce message, cela signifie que le routing fonctionne.
        </p>
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <p className="text-green-800">
            ✅ AdminLayout OK<br/>
            ✅ Routing OK<br/>
            ✅ Composant de base OK
          </p>
        </div>
      </div>
    </div>
  );
};

const SafeTestPipeline = () => {
  return (
    <ErrorBoundary>
      <UltraSimplePipeline />
    </ErrorBoundary>
  );
};

export default SafeTestPipeline;