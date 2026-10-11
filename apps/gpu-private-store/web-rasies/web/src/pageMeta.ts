import { useEffect } from 'react';

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.title = title;

    let descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement('meta');
      descriptionTag.name = 'description';
      document.head.appendChild(descriptionTag);
    }

    descriptionTag.content = description;
  }, [description, title]);
}
