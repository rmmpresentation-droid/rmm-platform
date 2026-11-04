import { createFileRoute } from '@tanstack/react-router';
import { LocalWorkspace } from '@/components/workspace/LocalWorkspace';
export const Route = createFileRoute('/dashboard')({ component: () => <LocalWorkspace initialRole="Networker" /> });
