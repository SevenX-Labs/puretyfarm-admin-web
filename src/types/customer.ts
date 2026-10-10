export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  profileImageUrl?: string | null;
  whatsappNumber?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerCounts {
  addresses: number;
  planSelections: number;
}

export interface CustomerListItem {
  id: string;
  mobile: string;
  email: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  profile: CustomerProfile | null;
  counts: CustomerCounts;
}

export interface CustomerAddress {
  id: string;
  userId: string;
  fullName: string;
  mobile: string;
  houseNumber: string;
  buildingName: string;
  streetName: string;
  landmark?: string | null;
  state: string;
  city: string;
  area: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
}

export interface CustomerPlan {
  id: string;
  planType: string;
  status: string;
  frequency: string;
  quantity: number;
  quantityMode: string;
  quantityA?: number | null;
  quantityB?: number | null;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface CustomerDetail extends CustomerListItem {
  addresses: CustomerAddress[];
  plans: CustomerPlan[];
}

export interface CustomerPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomersApiResponse {
  data: CustomerListItem[];
  pagination: CustomerPaginationMeta;
}
