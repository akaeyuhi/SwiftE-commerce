interface StoresPageHeaderProps {
  storesCount: number;
}

export function StoresPageHeader({ storesCount }: StoresPageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-foreground mb-2">
        Discover Stores
      </h1>
      <p className="text-lg text-muted-foreground">
        Browse through {storesCount} amazing stores
      </p>
    </div>
  );
}
