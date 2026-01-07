import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase, type Account, type Category, type VendorRule } from '@/lib/supabase'

interface VendorRuleWithCategory extends VendorRule {
  categories?: { name: string } | null
}

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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendorRules, setVendorRules] = useState<VendorRuleWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Search state
  const [vendorRuleSearch, setVendorRuleSearch] = useState('')

  // Edit dialog state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editFormData, setEditFormData] = useState<{ name: string; color?: string; icon?: string }>({ name: '' })

  // Create category dialog state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryData, setNewCategoryData] = useState<{ name: string; icon: string; parentId: string | null }>({
    name: '',
    icon: '',
    parentId: null
  })

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: accs }, { data: cats }, { data: rules }] = await Promise.all([
        supabase.from('accounts').select('*').order('name'),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('vendor_rules').select('*, categories(name)').order('priority', { ascending: false }),
      ])
      if (accs) setAccounts(accs)
      if (cats) setCategories(cats)
      if (rules) setVendorRules(rules as VendorRuleWithCategory[])
      setLoading(false)
    }
    fetchData()
  }, [])

  // Build category hierarchy: parent categories with their children
  const parentCategories = categories.filter(c => c.parent_id === null)
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId)

  // Filter vendor rules based on search
  const filteredVendorRules = vendorRules.filter((rule) => {
    if (!vendorRuleSearch) return true
    const searchLower = vendorRuleSearch.toLowerCase()
    return (
      rule.match_pattern.toLowerCase().includes(searchLower) ||
      rule.normalized_vendor.toLowerCase().includes(searchLower) ||
      rule.categories?.name.toLowerCase().includes(searchLower)
    )
  })

  // Edit handlers
  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setEditFormData({ name: account.name, color: account.color || '' })
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setEditFormData({ name: category.name, icon: category.icon || '' })
  }

  const handleSaveAccount = async () => {
    if (!editingAccount) return

    const { error } = await supabase
      .from('accounts')
      .update({
        name: editFormData.name,
        color: editFormData.color || null,
      })
      .eq('id', editingAccount.id)

    if (!error) {
      setAccounts(accounts.map(a =>
        a.id === editingAccount.id
          ? { ...a, name: editFormData.name, color: editFormData.color || null }
          : a
      ))
      setEditingAccount(null)
      setEditFormData({ name: '' })
    }
  }

  const handleSaveCategory = async () => {
    if (!editingCategory) return

    const { error } = await supabase
      .from('categories')
      .update({
        name: editFormData.name,
        icon: editFormData.icon || null,
      })
      .eq('id', editingCategory.id)

    if (!error) {
      setCategories(categories.map(c =>
        c.id === editingCategory.id
          ? { ...c, name: editFormData.name, icon: editFormData.icon || null }
          : c
      ))
      setEditingCategory(null)
      setEditFormData({ name: '' })
    }
  }

  const handleDeleteVendorRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this vendor rule?')) {
      return
    }

    const { error } = await supabase
      .from('vendor_rules')
      .delete()
      .eq('id', ruleId)

    if (!error) {
      setVendorRules(vendorRules.filter(r => r.id !== ruleId))
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    // Check if category has children
    const hasChildren = categories.some(c => c.parent_id === categoryId)
    if (hasChildren) {
      alert('Cannot delete category with subcategories. Please delete subcategories first.')
      return
    }

    // Check if category is used by transactions
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)

    if (count && count > 0) {
      if (!confirm(`This category is used by ${count} transaction(s). Deleting it will remove the category from those transactions. Continue?`)) {
        return
      }
    } else {
      if (!confirm('Are you sure you want to delete this category?')) {
        return
      }
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)

    if (!error) {
      setCategories(categories.filter(c => c.id !== categoryId))
    }
  }

  const handleCreateCategory = () => {
    setNewCategoryData({ name: '', icon: '', parentId: null })
    setIsCreatingCategory(true)
  }

  const handleSaveNewCategory = async () => {
    if (!newCategoryData.name.trim()) {
      alert('Category name is required')
      return
    }

    // Get max sort_order for new category
    const maxSortOrder = Math.max(0, ...categories.map(c => c.sort_order || 0))

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: newCategoryData.name,
        icon: newCategoryData.icon || null,
        parent_id: newCategoryData.parentId || null,
        sort_order: maxSortOrder + 1
      })
      .select()
      .single()

    if (!error && data) {
      setCategories([...categories, data])
      setIsCreatingCategory(false)
      setNewCategoryData({ name: '', icon: '', parentId: null })
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>
  }

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
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-[#fafafa]">
                    <td className="py-4 border-b border-border">
                      <div className="flex items-center gap-3 font-semibold">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: account.color || '#888',
                            boxShadow: `0 0 0 2px ${account.color || '#888'}33`,
                          }}
                        />
                        {account.name}
                      </div>
                    </td>
                    <td className="py-4 border-b border-border">
                      <StatusBadge status={account.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="py-4 border-b border-border text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditAccount(account)}>
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
              <Button size="sm" onClick={handleCreateCategory}>+ New</Button>
            </div>
            <div className="max-h-[400px] overflow-y-auto pr-2">
              <table className="w-full text-[15px]">
                <tbody>
                  {parentCategories.map((parent) => (
                    <React.Fragment key={parent.id}>
                      {/* Parent category */}
                      <tr className="hover:bg-[#fafafa]">
                        <td className="py-3 border-b border-border">
                          <div className="flex items-center gap-2 font-semibold">
                            <span>{parent.icon}</span>
                            <span>{parent.name}</span>
                          </div>
                        </td>
                        <td className="py-3 border-b border-border text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditCategory(parent)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(parent.id)}
                              className="text-destructive hover:text-destructive hover:bg-[var(--destructive-light)]"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {/* Child categories */}
                      {getChildren(parent.id).map((child) => (
                        <tr key={child.id} className="hover:bg-[#fafafa] bg-muted/30">
                          <td className="py-2 border-b border-border pl-8">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="text-sm">{child.icon}</span>
                              <span>{child.name}</span>
                            </div>
                          </td>
                          <td className="py-2 border-b border-border text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditCategory(child)}>
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategory(child.id)}
                                className="text-destructive hover:text-destructive hover:bg-[var(--destructive-light)]"
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
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
            <p className="text-muted-foreground text-sm mb-4">
              These rules automatically map raw vendor names to normalized names and categories.
            </p>
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search rules by pattern, vendor, or category..."
                value={vendorRuleSearch}
                onChange={(e) => setVendorRuleSearch(e.target.value)}
                className="w-full"
              />
            </div>
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
                    <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3 border-b-2 border-border">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendorRules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        {vendorRuleSearch ? 'No matching rules found.' : 'No vendor rules defined yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredVendorRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-[#fafafa]">
                        <td className="py-3 border-b border-border">
                          <code className="bg-muted px-2 py-1 rounded text-primary text-sm">
                            {rule.match_pattern}
                          </code>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({rule.match_type})
                          </span>
                        </td>
                        <td className="py-3 border-b border-border font-semibold">
                          {rule.normalized_vendor}
                        </td>
                        <td className="py-3 border-b border-border text-muted-foreground italic">
                          {rule.categories?.name || '(Keep)'}
                        </td>
                        <td className="py-3 border-b border-border text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVendorRule(rule.id)}
                            className="text-destructive hover:text-destructive hover:bg-[var(--destructive-light)]"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Account name"
              />
            </div>
            <div>
              <Label htmlFor="account-color">Color</Label>
              <Input
                id="account-color"
                type="color"
                value={editFormData.color || '#888888'}
                onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAccount(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAccount}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div>
              <Label htmlFor="category-icon">Icon (emoji)</Label>
              <Input
                id="category-icon"
                value={editFormData.icon || ''}
                onChange={(e) => setEditFormData({ ...editFormData, icon: e.target.value })}
                placeholder="🏠"
                maxLength={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCreatingCategory} onOpenChange={(open) => !open && setIsCreatingCategory(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-category-name">Category Name</Label>
              <Input
                id="new-category-name"
                value={newCategoryData.name}
                onChange={(e) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                placeholder="e.g. Transportation"
              />
            </div>
            <div>
              <Label htmlFor="new-category-icon">Icon (emoji)</Label>
              <Input
                id="new-category-icon"
                value={newCategoryData.icon}
                onChange={(e) => setNewCategoryData({ ...newCategoryData, icon: e.target.value })}
                placeholder="🚗"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="new-category-parent">Parent Category (optional)</Label>
              <Select
                value={newCategoryData.parentId || 'none'}
                onValueChange={(value) => setNewCategoryData({ ...newCategoryData, parentId: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level category)</SelectItem>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingCategory(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewCategory}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
