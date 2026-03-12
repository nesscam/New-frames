export interface Order {
  id: string;
  userId: string;
  total: number;
  items: any[];
  shippingAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  status: string;
  createdAt: any;
}
