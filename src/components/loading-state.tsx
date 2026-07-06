import { Card } from "@/components/ui";

export function LoadingState({ message = "Loading finance data..." }: { message?: string }) {
  return (
    <Card className="p-8 text-center text-sm text-slate-600">
      <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      {message}
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {message}
    </Card>
  );
}

