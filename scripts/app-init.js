function initNavigation() {
  document.querySelectorAll(".app-nav button").forEach((btn) => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });
}

function initFilters() {
  const expenseControls = [
    { id: "expense-member-filter", event: "change" },
    { id: "expense-account-filter", event: "change" },
    { id: "expense-category-filter", event: "input" },
    { id: "expense-sort", event: "change" },
  ];
  expenseControls.forEach(({ id, event }) => document.getElementById(id).addEventListener(event, renderExpenses));

  const incomeControls = [
    { id: "income-member-filter", event: "change" },
    { id: "income-account-filter", event: "change" },
    { id: "income-source-filter", event: "input" },
    { id: "income-sort", event: "change" },
  ];
  incomeControls.forEach(({ id, event }) => document.getElementById(id).addEventListener(event, renderIncome));
}

function init() {
  initNavigation();
  initFilters();
  initMembers();
  initAccounts();
  initExpenses();
  initIncome();
  initLoans();
  initTransfers();
  initCurrencies();
  initDataControls();
  renderAll();
  setDefaultDates();
	document.getElementById("expense-subcategory-filter")?.addEventListener("input", renderExpenses);
	document.getElementById("expense-from-date")?.addEventListener("change", renderExpenses);
	document.getElementById("expense-to-date")?.addEventListener("change", renderExpenses);

	document.getElementById("income-from-date")?.addEventListener("change", renderIncome);
	document.getElementById("income-to-date")?.addEventListener("change", renderIncome);

	document.getElementById("loan-status-filter")?.addEventListener("change", renderLoans);
	document.getElementById("loan-counterparty-filter")?.addEventListener("input", renderLoans);
}

document.addEventListener("DOMContentLoaded", init);
