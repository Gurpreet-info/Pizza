import React from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { usePageMeta } from '../hooks/usePageMeta';

export function NotFoundPage() {
  usePageMeta(
    'Page not found',
    'This page does not exist on Pizza Offers. Go home or open the menu to continue ordering.'
  );

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-2xl text-gray-600 mb-8">Page not found</p>
      <Link to="/">
        <Button size="lg">Go Home</Button>
      </Link>
    </div>
  );
}
