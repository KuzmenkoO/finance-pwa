function setActiveView(viewId) {
  document.querySelectorAll(".app-nav button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });

  document.querySelectorAll("section.view").forEach((section) => {
    section.classList.toggle("hidden", section.id !== viewId);
  });

  if (viewId === "accounts") setCurrencyFromMemory("account-currency", "accounts");
  if (viewId === "expenses") setCurrencyFromMemory("expense-currency", "expenses");
  if (viewId === "income") setCurrencyFromMemory("income-currency", "income");
  if (viewId === "loans") setCurrencyFromMemory("loan-currency", "loans");

  for (const key in currencyMemory) {
    if (key !== viewId) delete currencyMemory[key];
  }

  if (viewId === "accounts") setDefaultCurrencyForForm("account-currency", "accounts");
  if (viewId === "expenses") setDefaultCurrencyForForm("expense-currency", "expenses");
  if (viewId === "income") setDefaultCurrencyForForm("income-currency", "income");
  if (viewId === "loans") setDefaultCurrencyForForm("loan-currency", "loans");
}

const populateSelect = (
  select,
  entries,
  { valueKey = "id", labelKey = "name", includeAny = false, anyLabel = "Усі" } = {}
) => {
  const options = [];
  if (includeAny) {
    options.push(new Option(anyLabel, "all"));
  }
  entries.forEach((entry) => {
    options.push(new Option(entry[labelKey], entry[valueKey]));
  });
  select.replaceChildren(...options);
};

function refreshMemberOptions() {
  const memberSelects = ["account-owner", "expense-member", "income-member", "loan-member"];
  memberSelects.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      const entries =
        id === "account-owner"
          ? [{ id: SHARED_OWNER_ID, name: "Спільний рахунок" }, ...state.members]
          : state.members;
      populateSelect(element, entries);
    }
  });

  populateSelect(document.getElementById("expense-member-filter"), state.members, {
    includeAny: true,
  });

  populateSelect(document.getElementById("income-member-filter"), state.members, {
    includeAny: true,
  });
}

function getTransactionAccounts() {
  const result = [];
  const mainAccounts = getMainAccounts();
  mainAccounts.forEach((account) => {
    const children = getAccountChildren(account.id);
    if (children.length) {
      children.forEach((child) => {
        result.push({ id: child.id, name: getAccountLabel(child) });
      });
    } else {
      result.push({ id: account.id, name: account.name });
    }
  });
  return result;
}

function refreshAccountOptions() {
  const transactionAccounts = getTransactionAccounts();

  [
    "expense-account",
    "income-account",
    "loan-from-account",
    "loan-to-account",
    "transfer-from-account",
    "transfer-to-account",
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      populateSelect(element, transactionAccounts);
    }
  });

  populateSelect(document.getElementById("expense-account-filter"), transactionAccounts, { includeAny: true });
  populateSelect(document.getElementById("income-account-filter"), transactionAccounts, { includeAny: true });
}

function setCurrencyFromMemory(selectId, viewId) {
  const el = document.getElementById(selectId);
  if (el && !el.value) {
    el.value = getLastCurrency(viewId);
  }
  el?.addEventListener("change", () => {
    setLastCurrency(viewId, el.value);
  });
}

function refreshCurrencyOptions() {
  if (!state.currencies) return;
  const base = getBaseCurrency();
  const ordered = [base, ...state.currencies.filter(c => c.id !== base.id)];

  const selects = ["account-currency", "expense-currency", "income-currency", "loan-currency"];
  selects.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      populateSelect(
        element,
        ordered.map(cur => ({ id: cur.id, name: `${cur.code} — ${cur.name}` }))
      );
      if (!element.value) element.value = state.baseCurrencyId;
    }
  });

  const baseCurrencySelect = document.getElementById("base-currency-select");
  if (baseCurrencySelect) {
    populateSelect(
      baseCurrencySelect,
      ordered.map(cur => ({ id: cur.id, name: `${cur.code} — ${cur.name}` }))
    );
    baseCurrencySelect.value = state.baseCurrencyId;
  }
}

function refreshExpenseCategoryOptions() {
  const catDatalist = document.getElementById("expense-category-options");
  const subDatalist = document.getElementById("expense-subcategory-options");
  if (!catDatalist && !subDatalist) return;

  const categories = Array.from(
    new Set((state.expenses || []).map((exp) => (exp.category || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  if (catDatalist) {
    catDatalist.innerHTML = categories.map((cat) => `<option value="${cat}"></option>`).join("");
  }

  if (subDatalist) {
    const currentCategoryInput = document.getElementById("expense-category");
    const currentCategory = currentCategoryInput ? currentCategoryInput.value : "";
    updateExpenseSubcategoryOptions(currentCategory);
  }
}

function updateExpenseSubcategoryOptions(categoryValue) {
  const subDatalist = document.getElementById("expense-subcategory-options");
  if (!subDatalist) return;

  const normalized = (categoryValue || "").trim().toLowerCase();
  if (!normalized) {
    subDatalist.innerHTML = "";
    return;
  }

  const subcategories = Array.from(
    new Set(
      (state.expenses || [])
        .filter(
          (exp) => (exp.category || "").trim().toLowerCase() === normalized && (exp.subcategory || "").trim()
        )
        .map((exp) => exp.subcategory.trim())
    )
  ).sort((a, b) => a.localeCompare(b, "uk"));

  subDatalist.innerHTML = subcategories.map((sub) => `<option value="${sub}"></option>`).join("");
}

const LAST_CURRENCY_KEY = "last-selected-currency";
let lastSelectedCurrencyByView = JSON.parse(localStorage.getItem(LAST_CURRENCY_KEY) || "{}");

function getLastCurrency(viewId) {
  return lastSelectedCurrencyByView[viewId] || state.baseCurrencyId;
}

function setLastCurrency(viewId, currencyId) {
  lastSelectedCurrencyByView[viewId] = currencyId;
  localStorage.setItem(LAST_CURRENCY_KEY, JSON.stringify(lastSelectedCurrencyByView));
}

const currencyMemory = {};

function rememberCurrency(viewId, value) {
  if (value) {
    currencyMemory[viewId] = value;
  }
}

function getRememberedCurrency(viewId) {
  return currencyMemory[viewId] || state.baseCurrencyId;
}

function setDefaultCurrencyForForm(selectId, viewId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  el.value = getRememberedCurrency(viewId);
  el.addEventListener("change", () => {
    rememberCurrency(viewId, el.value);
  });
}
