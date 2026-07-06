import type { Account, AccountType } from "@/lib/types";

export function accountLabel(account: Account) {
  return `${account.code} - ${account.name}`;
}

export function accountOptions(accounts: Account[], types?: AccountType[]) {
  return accounts
    .filter((account) => account.is_active)
    .filter((account) => !types || types.includes(account.account_type))
    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
    .map((account) => ({
      value: account.id,
      label: accountLabel(account),
    }));
}

export function accountLabelById(accounts: Account[], accountId?: string | null) {
  const account = accounts.find((item) => item.id === accountId);
  return account ? accountLabel(account) : "";
}

export function defaultAccountId(accounts: Account[], code: string, types?: AccountType[]) {
  return (
    accounts.find((account) => account.code === code && (!types || types.includes(account.account_type)))
      ?.id ??
    accounts.find((account) => account.is_active && (!types || types.includes(account.account_type)))?.id ??
    ""
  );
}

