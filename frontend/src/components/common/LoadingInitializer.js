import { useEffect } from 'react';
import { useLoading } from '../../context/LoadingContext';
import { setLoadingHandlers } from '../../utils/api';

/**
 * This component initializes the loading handlers from the LoadingContext
 * to be used by the API utility for showing loading animations during API requests.
 */
const LoadingInitializer = () => {
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    // Set the loading handlers from the context to be used by the API utility
    setLoadingHandlers({ showLoading, hideLoading });
  }, [showLoading, hideLoading]);

  // This component doesn't render anything
  return null;
};

export default LoadingInitializer;