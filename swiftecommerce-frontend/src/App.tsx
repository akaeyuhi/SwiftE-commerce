function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-center mb-4">
          🚀 SwiftE-commerce Frontend
        </h1>
        <p className="text-center text-muted-foreground text-lg">
          Enterprise-grade React + TypeScript e-commerce platform
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="font-semibold mb-2">✅ Setup Complete</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• React 18.3 + TypeScript</li>
              <li>• Vite 5.4</li>
              <li>• Tailwind CSS</li>
              <li>• TanStack Query</li>
              <li>• Zustand</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
