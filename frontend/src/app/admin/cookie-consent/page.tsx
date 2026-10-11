import { Metadata } from 'next';
import { getServerSession } from '@/lib/get-server-session';
import { hasPermission, type RoleLike } from '@/lib/permissions/permissions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CookiePreferencesLink } from '@/components/cookie-preferences-link';
import { CookieBannerEditor } from '@/components/admin/cookie-banner-editor';

export const metadata: Metadata = {
  title: 'Cookie Consent Management',
  description: 'Manage cookie consent settings and view statistics.',
};

export default async function CookieConsentPage() {
  const session = await getServerSession();
  
  if (!session?.user?.roles || !(await hasPermission((session?.user?.roles ?? undefined) as RoleLike[] | undefined, { resource: 'admin', action: 'read' }))) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 h-full">
        <h1 className="text-xl font-bold text-muted-foreground">You do not have permission to access this page.</h1>
        <Button variant={"secondary"}>
          <Link href="/admin">Go to admin dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cookie Consent Management</h1>
        <CookiePreferencesLink variant="button" />
      </div>

      <CookieBannerEditor />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cookie Categories</CardTitle>
            <CardDescription>Types of cookies used on this website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Necessary</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Always Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Analytics</span>
              <span className="text-xs rounded bg-zinc-200 px-2 py-1 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">Optional</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Marketing</span>
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Optional</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Preferences</span>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Optional</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
            <CardDescription>GDPR and privacy compliance status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">GDPR Compliant</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Yes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cookie Banner</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Granular Control</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Available</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Consent Storage</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Local + Cookie</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Implementation</CardTitle>
            <CardDescription>Technical implementation details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Storage Method</span>
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">localStorage + Cookies</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Expiry</span>
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">365 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Analytics Integration</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Conditional</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Marketing Integration</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Conditional</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cookie Policy Information</CardTitle>
          <CardDescription>Important information about cookie usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">What are cookies?</h4>
            <p className="text-sm text-muted-foreground">
              Cookies are small text files that are stored on your device when you visit our website. 
              They help us provide you with a better experience and understand how you use our site.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">How we use cookies</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Necessary cookies:</strong> Essential for the website to function properly</li>
              <li>• <strong>Analytics cookies:</strong> Help us understand how visitors use our website</li>
              <li>• <strong>Marketing cookies:</strong> Used to display relevant advertisements</li>
              <li>• <strong>Preference cookies:</strong> Remember your choices and settings</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Your rights</h4>
            <p className="text-sm text-muted-foreground">
              You have the right to accept or decline cookies, and you can change your preferences at any time. 
              You can manage your cookie settings using the button above or through the link in our footer.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 