export type RowStatus = "draft" | "pending" | "approved" | "paid" | "rejected";
export type PaymentStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue";
export type RecurringStatus = "active" | "paused" | "cancelled";
export type AccountType = "asset" | "liability" | "equity" | "income" | "cost_of_sales" | "expense";
export type NormalBalance = "debit" | "credit";

export type Account = {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  parent_account_id: string | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type Expense = {
  id: string;
  date: string;
  supplier: string;
  description: string;
  category: string;
  account_id: string | null;
  subcategory: string | null;
  payment_method: string | null;
  invoice_reference: string | null;
  amount_excl_vat: number;
  vat_amount: number;
  total_amount: number;
  project_client: string | null;
  department: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  approved_by: string | null;
  status: RowStatus;
  notes: string | null;
  attachment_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Income = {
  id: string;
  date: string;
  client: string;
  description: string;
  invoice_number: string | null;
  category: string;
  account_id: string | null;
  amount_excl_vat: number;
  vat_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  project: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RecurringCost = {
  id: string;
  supplier: string;
  service_name: string;
  category: string;
  account_id: string | null;
  monthly_cost: number;
  billing_cycle: string;
  renewal_date: string | null;
  payment_method: string | null;
  owner: string | null;
  status: RecurringStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Budget = {
  id: string;
  month: string;
  category: string;
  account_id: string | null;
  budget_amount: number;
  actual_amount: number;
  variance: number;
  created_at?: string;
  updated_at?: string;
};

export type CompanySettings = {
  id: number;
  company_name: string;
  vat_rate: number;
  default_currency: string;
  expense_categories: string[];
  income_categories: string[];
  departments: string[];
  projects_clients: string[];
  created_at?: string;
  updated_at?: string;
};
