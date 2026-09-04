/**
 * Order Manager & Menu Types
 */

export type SpiceLevel = 'mild' | 'medium' | 'spicy' | 'extra_spicy';

export interface MenuItemOption {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: 'biryani' | 'bowls' | 'street_eats' | 'beverages' | 'desserts' | 'breads';
  price: number;
  image: string;
  defaultSpiceLevel?: SpiceLevel;
  allowSpiceCustomization?: boolean;
  availableOptions?: MenuItemOption[];
  tags?: string[];
  popular?: boolean;
}

export interface OrderItemCustomization {
  spiceLevel?: SpiceLevel;
  selectedOptions?: MenuItemOption[];
  specialInstructions?: string;
  removedIngredients?: string[];
}

export interface OrderItem {
  id: string; // Unique cart line item ID
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  customization: OrderItemCustomization;
  itemTotal: number;
}

export type OrderStatus = 'empty' | 'building' | 'reviewing' | 'confirmed' | 'cooking' | 'delivered';

export interface OrderState {
  orderId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  deliveryAddress?: string;
  customerNotes?: string;
  lastUpdatedTimestamp: number;
}

export type OrderActionType = 
  | 'ADD_ITEM' 
  | 'REMOVE_ITEM' 
  | 'UPDATE_QUANTITY' 
  | 'UPDATE_CUSTOMIZATION' 
  | 'CLEAR_ORDER' 
  | 'SET_STATUS' 
  | 'SET_DELIVERY_ADDRESS';

export interface OrderAction {
  type: OrderActionType;
  menuItemId?: string;
  cartItemId?: string;
  name?: string;
  quantity?: number;
  spiceLevel?: SpiceLevel;
  options?: MenuItemOption[];
  specialInstructions?: string;
  status?: OrderStatus;
  address?: string;
}

export interface OrderManager {
  readonly state: OrderState;
  
  applyAction(action: OrderAction): OrderState;
  applyActions(actions: OrderAction[]): OrderState;
  getItem(cartItemId: string): OrderItem | undefined;
  calculateTotals(): { subtotal: number; tax: number; deliveryFee: number; total: number };
  resetOrder(): OrderState;
  subscribe(listener: (state: OrderState) => void): () => void;
}
