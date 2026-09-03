const SELECTED_COMPANY_KEY = 'haodaone_selected_company_id';

export const tenantStorage = {
  getSelectedCompanyId: () => localStorage.getItem(SELECTED_COMPANY_KEY),
  setSelectedCompanyId: (companyId) => {
    if (companyId) localStorage.setItem(SELECTED_COMPANY_KEY, String(companyId));
    else localStorage.removeItem(SELECTED_COMPANY_KEY);
  },
  clear: () => localStorage.removeItem(SELECTED_COMPANY_KEY),
};