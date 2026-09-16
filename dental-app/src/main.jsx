import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Caught by Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '40px auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#e11d48', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Application Encountered an Error</h2>
          <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6' }}>
            The application encountered an unexpected issue while loading. Please try refreshing the page or clearing your browser cache.
          </p>
          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto' }}>
            <code style={{ color: '#0f172a', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.toString()}
            </code>
          </div>
          <button 
            onClick={() => window.location.reload(true)} 
            style={{ marginTop: '24px', padding: '10px 20px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          >
            Hard Refresh (Reload Page)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
