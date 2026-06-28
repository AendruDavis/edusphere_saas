export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  date: string;
  term: string;
  year: string;
  school: {
    name: string;
    logoUrl: string | null;
    address: string;
    tin: string;
    deoCode: string;
    primaryColor: string;
    bankName: string;
    bankAccount: string;
    payCode: string;
    motto: string;
  };
  student: {
    name: string;
    lin: string;
    class: string;
  };
  items: InvoiceLineItem[];
  subtotal: number;
  vat: number;
  total: number;
  paid: number;
  balance: number;
  currency: string;
};
