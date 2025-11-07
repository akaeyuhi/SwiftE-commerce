import { useCallback, useRef } from 'react';

interface UseInfiniteScrollProps {
  isLoading: boolean;
  hasNextPage?: boolean;
  callback: () => void;
}

export function useInfiniteScroll({
  isLoading,
  hasNextPage,
  callback,
}: UseInfiniteScrollProps) {
  const observer = useRef<IntersectionObserver>(null);

  return useCallback(
    (node: HTMLElement | null) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          callback();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, hasNextPage, callback]
  );
}
