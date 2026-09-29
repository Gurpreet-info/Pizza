import { Phone } from 'lucide-react';
import { Button } from './ui/button';

interface CallUsButtonProps {
  phone?: string;
}

export function CallUsButton({
  phone = '+9054949333',
}: CallUsButtonProps) {
  return (
    <Button
      asChild
      size="lg"
      className={`bg-orange-600 hover:bg-orange-700 text-base px-7`}
    >
      <a href={`tel:${phone}`}>
        <Phone className="h-4 w-4" />
            Call Us
      </a>
    </Button>
  );
}
```
