const STORAGE_KEY = "home-finance-app-state";

// ==== Експорт / імпорт даних ====
function exportDB() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "user_data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importDB(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      const requiredKeys = ["accounts", "expenses", "income", "loans", "currencies", "members"];
      const errors = [];

      for (const key of requiredKeys) {
        if (!(key in imported)) {
          errors.push(`Відсутній ключ: ${key}`);
        } else if (!Array.isArray(imported[key])) {
          errors.push(`Ключ ${key} має бути масивом`);
        }
      }

      if (errors.length > 0) {
        console.error("Помилки імпорту:", errors);
        alert("❌ Помилки імпорту:\n" + errors.join("\n"));
        return;
      }

      state = {
        ...deepClone(defaultState),
        ...imported,
      };
      saveState();
      alert("✅ Дані успішно імпортовано!");
      location.reload();
    } catch (e) {
      console.error("JSON Decode Error:", e);
      alert("❌ Файл не валідний JSON: " + e.message);
    }
  };
  reader.readAsText(file);
}

const SHARED_OWNER_ID = "shared";
const COLLECTION_PREFIX = {
  members: "member",
  accounts: "acc",
  expenses: "exp",
  income: "inc",
  loans: "loan",
  currencies: "cur",
};
const accountExpandedState = {};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const defaultState = {
  currencies: [
    { id: "cur-uah", code: "UAH", name: "Гривня", rateToBase: 1 },
    { id: "cur-usd", code: "USD", name: "Долар США", rateToBase: 40 },
    { id: "cur-eur", code: "EUR", name: "Євро", rateToBase: 42 },
  ],
  baseCurrencyId: "cur-uah",
  members: [
    { id: "member-1", name: "Олена", role: "Мама" },
    { id: "member-2", name: "Ігор", role: "Тато" },
    { id: "member-3", name: "Марко", role: "Син" },
  ],
  accounts: [
    {
      id: "acc-1",
      name: "Спільна картка",
      owner: SHARED_OWNER_ID,
      balance: 12500,
      currencyId: "cur-uah",
      note: "Побутові витрати",
    },
    {
      id: "acc-2",
      name: "Зарплатна Олени",
      owner: "member-1",
      balance: 8400,
      currencyId: "cur-uah",
      note: "",
    },
    {
      id: "acc-3",
      name: "Зарплатна Ігоря",
      owner: "member-2",
      balance: 10550,
      currencyId: "cur-uah",
      note: "",
    },
  ],
  expenses: [
    {
      id: "exp-1",
      date: new Date().toISOString().slice(0, 10),
      memberId: "member-1",
      accountId: "acc-1",
      category: "Продукти",
      subcategory: "Супермаркет",
      description: "Супермаркет",
      amount: 1250,
      currencyId: "cur-uah",
    },
  ],
  income: [
    {
      id: "inc-1",
      date: new Date().toISOString().slice(0, 10),
      memberId: "member-2",
      accountId: "acc-3",
      source: "Робота",
      description: "Зарплата",
      amount: 25000,
      currencyId: "cur-uah",
    },
  ],
  loans: [
    {
      id: "loan-1",
      memberId: "member-1",
      counterparty: "Вася",
      direction: "owe",
      amount: 3000,
      fromAccountId: "acc-1",
      toAccountId: "acc-2",
      currencyId: "cur-uah",
      date: new Date().toISOString().slice(0, 10),
      status: "active",
      note: "Покупка техніки",
    },
  ],
};

let state = loadState();

function getBaseCurrency() {
  const base =
    state.currencies &&
    state.currencies.find((currency) => currency.id === state.baseCurrencyId);
  return base || (state.currencies && state.currencies[0]) || { code: "UAH", rateToBase: 1 };
}

const findCurrency = (id) => {
  if (!state.currencies) return null;
  return state.currencies.find((currency) => currency.id === id) || null;
};

const convertToBase = (amount, currencyId) => {
  const currency = findCurrency(currencyId) || getBaseCurrency();
  const rate = Number(currency.rateToBase || 1);
  return Number(amount || 0) * rate;
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(defaultState);
    const parsed = JSON.parse(raw);
    const merged = {
      ...deepClone(defaultState),
      ...parsed,
    };

    if (!merged.currencies) {
      merged.currencies = deepClone(defaultState.currencies);
      merged.baseCurrencyId = defaultState.baseCurrencyId;
    }

    merged.accounts = (merged.accounts || []).map((acc) => ({
      ...acc,
      parentId: acc.parentId || null,
      currencyId: acc.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
    }));

    merged.expenses = (merged.expenses || []).map((exp) => ({
      ...exp,
      subcategory: exp.subcategory || "",
      currencyId: exp.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
    }));

    merged.income = (merged.income || []).map((inc) => ({
      ...inc,
      currencyId: inc.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
    }));

    merged.loans = (merged.loans || []).map((loan) => {
      if (loan.memberId && loan.counterparty) {
        return {
          ...loan,
          currencyId: loan.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
          fromAccountId: loan.fromAccountId || null,
          toAccountId: loan.toAccountId || null,
        };
      }

      const borrower = loan.borrowerId ? loan.borrowerId : null;
      const lender = loan.lenderId ? loan.lenderId : null;
      let memberId = borrower || lender || (merged.members && merged.members[0]?.id);
      let counterpartyName = "";
      let direction = "owe";

      const borrowerMember = borrower && merged.members.find((m) => m.id === borrower);
      const lenderMember = lender && merged.members.find((m) => m.id === lender);

      if (borrowerMember && lenderMember) {
        memberId = borrowerMember.id;
        counterpartyName = lenderMember.name;
        direction = "owe";
      } else if (borrowerMember) {
        memberId = borrowerMember.id;
        counterpartyName = loan.note || "Контрагент";
        direction = "owe";
      } else if (lenderMember) {
        memberId = lenderMember.id;
        counterpartyName = loan.note || "Контрагент";
        direction = "lend";
      }

      return {
        id: loan.id,
        memberId,
        counterparty: counterpartyName,
        direction,
        amount: loan.amount || 0,
        currencyId: loan.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
        fromAccountId: loan.fromAccountId || null,
        toAccountId: loan.toAccountId || null,
        date: loan.date || new Date().toISOString().slice(0, 10),
        status: loan.status || "active",
        note: loan.note || "",
      };
    });

    if (merged.accounts && merged.accounts.length) {
      const list = merged.accounts;
      list.forEach((acc) => {
        if (acc.parentId) return;
        const children = list.filter((item) => item.parentId === acc.id);
        if (children.length) {
          acc.balance = children.reduce((sum, item) => sum + Number(item.balance || 0), 0);
        }
      });
    }

    return merged;
  } catch (error) {
    console.error("Cannot load state", error);
    return deepClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const uid = (prefix) =>
  `${prefix}-${(crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2, 9)}`;

const formatMoney = (value, currencyCode) => {
  const base = getBaseCurrency();
  const code = currencyCode || base.code || "UAH";
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
};

const findMember = (id) => {
  if (id === SHARED_OWNER_ID) {
    return { id, name: "Спільний", role: "Для всіх" };
  }
  return state.members.find((m) => m.id === id);
};

const findAccount = (id) => state.accounts.find((acc) => acc.id === id);

const getMainAccounts = () => state.accounts.filter((acc) => !acc.parentId);

const getAccountChildren = (parentId, list = state.accounts) =>
  list.filter((acc) => acc.parentId === parentId);

const hasSubaccounts = (parentId, list = state.accounts) =>
  list.some((acc) => acc.parentId === parentId);

const updateParentBalance = (parentId, list = state.accounts) => {
  const parent = list.find((acc) => acc.id === parentId);
  if (!parent) return;
  const total = getAccountChildren(parentId, list).reduce(
    (sum, acc) => sum + Number(acc.balance || 0),
    0
  );
  parent.balance = total;
};

const normalizeAccountHierarchy = (list = state.accounts) => {
  list.forEach((acc) => {
    if (!acc.parentId && hasSubaccounts(acc.id, list)) {
      updateParentBalance(acc.id, list);
    }
  });
};

const getAccountLabel = (account) => {
  if (!account) return "گ?گçگ?‘-گ?گ?گ?گ?";
  if (account.parentId) {
    const parent = findAccount(account.parentId);
    return parent ? `${parent.name} / ${account.name}` : account.name;
  }
  return account.name;
};

const convertAmountBetweenCurrencies = (amount, fromCurrencyId, toCurrencyId) => {
  if (!amount) return 0;
  const base = convertToBase(amount, fromCurrencyId);
  const to = findCurrency(toCurrencyId) || getBaseCurrency();
  const rateTo = Number(to.rateToBase || 1);
  if (!rateTo) return 0;
  return base / rateTo;
};
