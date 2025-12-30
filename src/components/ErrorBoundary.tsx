import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { Button } from './ui/Button';

interface Props extends WithTranslation {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryComponent extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-6 bg-slate-900/50 rounded-2xl border border-red-500/20">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-red-500 w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">{t('errorBoundary.title')}</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              {t('errorBoundary.description')}
            </p>
            {this.state.error && (
              <p className="text-xs text-red-400 font-mono bg-red-950/30 p-2 rounded mt-2">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button onClick={this.handleReload} variant="primary">
            <RefreshCw className="mr-2" size={18} />
            {t('errorBoundary.reload')}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryComponent);
