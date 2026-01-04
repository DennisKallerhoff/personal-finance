import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Mock data - will be replaced with real data from Supabase
const MOCK_ACCOUNTS = [
  { id: '1', name: 'ING Main', color: '#f97316', status: 'active' },
  { id: '2', name: 'Credit Card (Visa)', color: '#2563eb', status: 'active' },
]

const MOCK_CATEGORIES = [
  'Groceries',
  'Rent/Utilities',
  'Dining Out',
  'Transport',
  'Entertainment',
  'Household',
  'Insurance',
]

const MOCK_VENDOR_RULES = [
  { id: '1', pattern: 'AMAZON.*', mapsTo: 'Amazon', category: null },
  { id: '2', pattern: 'REWE.*', mapsTo: 'REWE', category: 'Groceries' },
  { id: '3', pattern: 'PAYPAL *SPOTIFY', mapsTo: 'Spotify', category: 'Subscriptions' },
  { id: '4', pattern: 'DB VERTRIEB GMBH', mapsTo: 'DB Bahn', category: 'Transport' },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--success-light)] text-[#166534]">
        Active
      </span>
    )
  }
  return (
    <span className="inline-flex text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-muted text-muted-foreground">
      Inactive
    </span>
  )
}

export default function Settings() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Settings</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Account Management */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
                Accounts
              </h3>
              <Button size="sm">+ Add</Button>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                    Status
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ACCOUNTS.map((account) => (
                  <tr key={account.id} className="hover:bg-[#fafafa]">
                    <td className="py-4 border-b border-border">
                      <div className="flex items-center gap-3 font-semibold">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: account.color,
                            boxShadow: `0 0 0 2px ${account.color}33`,
                          }}
                        />
                        {account.name}
                      </div>
                    </td>
                    <td className="py-4 border-b border-border">
                      <StatusBadge status={account.status} />
                    </td>
                    <td className="py-4 border-b border-border text-right">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">
              Data Management
            </h3>
            <p className="text-muted-foreground text-[15px] mb-6">
              Export your entire transaction history or raw data for external backups.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1">
                Export to CSV
              </Button>
              <Button variant="outline" className="flex-1">
                Export to JSON
              </Button>
            </div>

            <hr className="my-8 border-t-2 border-border" />

            <h4 className="text-destructive font-heading font-bold mb-3">
              Danger Zone
            </h4>
            <Button
              variant="outline"
              className="w-full text-destructive border-[var(--destructive-light)] hover:bg-[var(--destructive-light)]"
            >
              Reset All Data
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Categories Management */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
                Categories
              </h3>
              <Button size="sm">+ New</Button>
            </div>
            <div className="max-h-[400px] overflow-y-auto pr-2">
              <table className="w-full text-[15px]">
                <tbody>
                  {MOCK_CATEGORIES.map((category) => (
                    <tr key={category} className="hover:bg-[#fafafa]">
                      <td className="py-3 border-b border-border font-medium">
                        {category}
                      </td>
                      <td className="py-3 border-b border-border text-right">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Rules */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
                Vendor Normalization Rules
              </h3>
              <Button size="sm">+ Add Rule</Button>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              These rules automatically map raw vendor names to normalized names and categories.
            </p>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                      Pattern
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                      Maps To
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_VENDOR_RULES.map((rule) => (
                    <tr key={rule.id} className="hover:bg-[#fafafa]">
                      <td className="py-3 border-b border-border">
                        <code className="bg-muted px-2 py-1 rounded text-primary text-sm">
                          {rule.pattern}
                        </code>
                      </td>
                      <td className="py-3 border-b border-border font-semibold">
                        {rule.mapsTo}
                      </td>
                      <td className="py-3 border-b border-border text-muted-foreground italic">
                        {rule.category || '(Keep)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
