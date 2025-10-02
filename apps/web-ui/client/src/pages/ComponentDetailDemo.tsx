import React from 'react';
import { Link } from 'wouter';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/Badge';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function ComponentDetailDemo() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Design System' },
        { label: 'Component Detail Demo' }
      ]}
    >
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/catalog">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Catalog
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Component Detail Page Design
                </h1>
                <p className="text-muted-foreground">
                  Dark mode implementation of the UXPin component detail design
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-8">
            {/* Design Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Design Implementation</CardTitle>
                <CardDescription>
                  This page demonstrates the component detail design from your UXPin example,
                  implemented with dark mode support and Shinobi's design system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Features Implemented</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>✅ Dark mode support with CSS variables</li>
                      <li>✅ Responsive layout with sidebar</li>
                      <li>✅ Component header with breadcrumbs</li>
                      <li>✅ Security & compliance sections</li>
                      <li>✅ Triggers & bindings display</li>
                      <li>✅ Observability metrics</li>
                      <li>✅ Interactive collapsible config schema</li>
                      <li>✅ AI chat sidebar integration</li>
                      <li>✅ Related components grid</li>
                      <li>✅ Fixed navigation sidebar</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Design System Integration</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>✅ Shadcn/UI components</li>
                      <li>✅ Consistent color scheme</li>
                      <li>✅ Proper typography hierarchy</li>
                      <li>✅ Accessible interactions</li>
                      <li>✅ Mobile-responsive design</li>
                      <li>✅ Loading states</li>
                      <li>✅ Error handling</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Live Demo</CardTitle>
                <CardDescription>
                  Click the button below to see the component detail page in action
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Link href="/component/s3-bucket">
                    <Button>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View S3 Bucket Component
                    </Button>
                  </Link>
                  <Link href="/component/lambda-api-gateway">
                    <Button variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Lambda API Component
                    </Button>
                  </Link>
                  <Link href="/component/postgres-rds">
                    <Button variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View PostgreSQL RDS Component
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Design Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Design Patterns Used</CardTitle>
                <CardDescription>
                  Key design patterns implemented from the UXPin example
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Layout Structure</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Two-column layout with main content and sidebar</li>
                      <li>• Fixed navigation sidebar on desktop</li>
                      <li>• Responsive grid system</li>
                      <li>• Consistent spacing and padding</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Interactive Elements</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Collapsible configuration schema</li>
                      <li>• Interactive AI chat sidebar</li>
                      <li>• Hover states and transitions</li>
                      <li>• Form inputs and buttons</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Content Organization</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Clear section hierarchy</li>
                      <li>• Status indicators and badges</li>
                      <li>• Related components grid</li>
                      <li>• Compliance framework display</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Implementation */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Implementation</CardTitle>
                <CardDescription>
                  How the design was implemented in the Shinobi web UI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">File Structure</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                      <div>apps/web-ui/client/src/pages/</div>
                      <div className="ml-4">├── ComponentDetail.tsx</div>
                      <div className="ml-4">└── ComponentDetailDemo.tsx</div>
                      <div className="mt-2">apps/web-ui/client/src/components/ui/</div>
                      <div className="ml-4">├── breadcrumb.tsx</div>
                      <div className="ml-4">├── collapsible.tsx</div>
                      <div className="ml-4">└── avatar.tsx</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Key Features</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Badge variant="outline" className="mb-2">React Hooks</Badge>
                        <p className="text-sm text-muted-foreground">
                          useState for collapsible state, useRoute for navigation
                        </p>
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-2">TypeScript</Badge>
                        <p className="text-sm text-muted-foreground">
                          Fully typed component props and interfaces
                        </p>
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-2">Tailwind CSS</Badge>
                        <p className="text-sm text-muted-foreground">
                          Responsive design with dark mode support
                        </p>
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-2">Wouter Router</Badge>
                        <p className="text-sm text-muted-foreground">
                          Client-side routing with parameter support
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
