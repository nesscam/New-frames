export interface Order {
  id: string;
  userId: string;
  total: number;
  items: any[];
  status: string;
  createdAt: any;
}
