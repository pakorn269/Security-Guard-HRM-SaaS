import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import Button from './Button';

export const ErrorBoundary = () => {
  const error = useRouteError();
  let errorMessage: string;

  if (isRouteErrorResponse(error)) {
    // error is type `ErrorResponse`
    errorMessage = error.statusText || error.data?.message || 'Unknown error';
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    console.error(error);
    errorMessage = 'Unknown error';
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-4xl font-bold text-error-500">Oops!</h1>
        <div className="space-y-2">
            <p className="text-xl text-neutral-900 dark:text-neutral-100">Sorry, an unexpected error has occurred.</p>
            <p className="text-neutral-500 dark:text-neutral-400">We've logged the error and will look into it.</p>
        </div>
        
        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-auto max-h-48 text-left border border-neutral-200 dark:border-neutral-700">
          <p className="font-mono text-sm text-error-600 dark:text-error-400 break-words">
            {errorMessage}
          </p>
        </div>

        <div className="flex justify-center gap-4">
            <Button variant="primary" onClick={() => window.location.reload()}>
                Reload Page
            </Button>
            <Link to="/">
                <Button variant="outline">
                    Go to Dashboard
                </Button>
            </Link>
        </div>
      </div>
    </div>
  );
};
