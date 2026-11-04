import { createFileRoute } from '@tanstack/react-router';
import { LocalWorkspace } from '@/components/workspace/LocalWorkspace';
export const Route = createFileRoute('/admin')({ component: () => <LocalWorkspace /> });
