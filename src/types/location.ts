export interface StateItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CityItem {
  id: string;
  name: string;
  stateId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AreaItem {
  id: string;
  name: string;
  cityId: string;
  pincode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
