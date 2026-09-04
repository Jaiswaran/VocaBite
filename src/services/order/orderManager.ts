import { OrderState, OrderAction, OrderItem, OrderManager, SpiceLevel, MenuItemOption } from './types';
import { MENU_ITEMS, findMenuItemByNameOrQuery } from './menu';

export function createInitialOrderState(): OrderState {
  return {
    orderId: `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    status: 'empty',
    items: [],
    subtotal: 0,
    tax: 0,
    deliveryFee: 0,
    total: 0,
    lastUpdatedTimestamp: Date.now(),
  };
}

export class ConcreteOrderManager implements OrderManager {
  private _state: OrderState;
  private listeners: Set<(state: OrderState) => void> = new Set();

  constructor(initialState?: OrderState) {
    this._state = initialState || createInitialOrderState();
  }

  get state(): OrderState {
    return this._state;
  }

  getItem(cartItemId: string): OrderItem | undefined {
    return this._state.items.find(i => i.id === cartItemId);
  }

  calculateTotals(): { subtotal: number; tax: number; deliveryFee: number; total: number } {
    const subtotal = this._state.items.reduce((acc, item) => acc + item.itemTotal, 0);
    const tax = Math.round(subtotal * 0.0825 * 100) / 100; // 8.25% sales tax
    const deliveryFee = subtotal > 0 ? (subtotal > 35 ? 0 : 3.99) : 0;
    const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax,
      deliveryFee,
      total,
    };
  }

  applyAction(action: OrderAction): OrderState {
    const nextItems = [...this._state.items];

    switch (action.type) {
      case 'ADD_ITEM': {
        const itemInfo = (action.menuItemId ? MENU_ITEMS.find(m => m.id === action.menuItemId) : null) ||
                         (action.name ? findMenuItemByNameOrQuery(action.name) : null);

        if (itemInfo) {
          const quantity = action.quantity && action.quantity > 0 ? action.quantity : 1;
          const spiceLevel: SpiceLevel = action.spiceLevel || itemInfo.defaultSpiceLevel || 'medium';
          const options: MenuItemOption[] = action.options || [];
          
          const optionsPrice = options.reduce((sum, opt) => sum + (opt.price || 0), 0);
          const unitPrice = itemInfo.price + optionsPrice;
          const itemTotal = unitPrice * quantity;

          // Check if identical item (same menu ID and customization) already exists
          const existingIndex = nextItems.findIndex(i => 
            i.menuItemId === itemInfo.id && 
            i.customization.spiceLevel === spiceLevel &&
            JSON.stringify(i.customization.selectedOptions) === JSON.stringify(options)
          );

          if (existingIndex >= 0) {
            const existing = nextItems[existingIndex];
            const newQty = existing.quantity + quantity;
            nextItems[existingIndex] = {
              ...existing,
              quantity: newQty,
              itemTotal: unitPrice * newQty,
            };
          } else {
            const newItem: OrderItem = {
              id: `ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              menuItemId: itemInfo.id,
              name: itemInfo.name,
              price: itemInfo.price,
              quantity,
              customization: {
                spiceLevel,
                selectedOptions: options,
                specialInstructions: action.specialInstructions,
              },
              itemTotal,
            };
            nextItems.push(newItem);
          }
        }
        break;
      }

      case 'REMOVE_ITEM': {
        if (action.cartItemId) {
          const idx = nextItems.findIndex(i => i.id === action.cartItemId);
          if (idx >= 0) nextItems.splice(idx, 1);
        } else if (action.name || action.menuItemId) {
          const itemInfo = (action.menuItemId ? MENU_ITEMS.find(m => m.id === action.menuItemId) : null) ||
                           (action.name ? findMenuItemByNameOrQuery(action.name) : null);
          if (itemInfo) {
            const idx = nextItems.findIndex(i => i.menuItemId === itemInfo.id);
            if (idx >= 0) nextItems.splice(idx, 1);
          }
        }
        break;
      }

      case 'UPDATE_QUANTITY': {
        const targetIndex = action.cartItemId
          ? nextItems.findIndex(i => i.id === action.cartItemId)
          : action.name
          ? nextItems.findIndex(i => i.name.toLowerCase().includes(action.name!.toLowerCase()))
          : -1;

        if (targetIndex >= 0) {
          const item = nextItems[targetIndex];
          const newQty = action.quantity ?? 1;
          if (newQty <= 0) {
            nextItems.splice(targetIndex, 1);
          } else {
            const optionsPrice = (item.customization.selectedOptions || []).reduce((s, o) => s + (o.price || 0), 0);
            const unitPrice = item.price + optionsPrice;
            nextItems[targetIndex] = {
              ...item,
              quantity: newQty,
              itemTotal: unitPrice * newQty,
            };
          }
        }
        break;
      }

      case 'UPDATE_CUSTOMIZATION': {
        // Find by cartItemId, or target the most recent matching item
        let targetIndex = -1;
        if (action.cartItemId) {
          targetIndex = nextItems.findIndex(i => i.id === action.cartItemId);
        } else if (action.name) {
          // find last added matching item
          for (let i = nextItems.length - 1; i >= 0; i--) {
            if (nextItems[i].name.toLowerCase().includes(action.name.toLowerCase())) {
              targetIndex = i;
              break;
            }
          }
        } else if (nextItems.length > 0) {
          // default to most recently added item
          targetIndex = nextItems.length - 1;
        }

        if (targetIndex >= 0) {
          const item = nextItems[targetIndex];
          const newSpice = action.spiceLevel || item.customization.spiceLevel;
          const newOptions = action.options || item.customization.selectedOptions;
          const newInstructions = action.specialInstructions !== undefined ? action.specialInstructions : item.customization.specialInstructions;

          const optionsPrice = (newOptions || []).reduce((s, o) => s + (o.price || 0), 0);
          const unitPrice = item.price + optionsPrice;

          nextItems[targetIndex] = {
            ...item,
            customization: {
              ...item.customization,
              spiceLevel: newSpice,
              selectedOptions: newOptions,
              specialInstructions: newInstructions,
            },
            itemTotal: unitPrice * item.quantity,
          };
        }
        break;
      }

      case 'CLEAR_ORDER': {
        nextItems.length = 0;
        break;
      }

      case 'SET_STATUS': {
        if (action.status) {
          this._state.status = action.status;
        }
        break;
      }

      case 'SET_DELIVERY_ADDRESS': {
        if (action.address) {
          this._state.deliveryAddress = action.address;
        }
        break;
      }
    }

    this._state.items = nextItems;
    const totals = this.calculateTotals();
    this._state = {
      ...this._state,
      items: nextItems,
      ...totals,
      status: nextItems.length === 0 ? 'empty' : (this._state.status === 'confirmed' || this._state.status === 'cooking' ? this._state.status : 'building'),
      lastUpdatedTimestamp: Date.now(),
    };

    this.notify();
    return this._state;
  }

  applyActions(actions: OrderAction[]): OrderState {
    if (!actions || actions.length === 0) return this._state;
    for (const action of actions) {
      this.applyAction(action);
    }
    return this._state;
  }

  resetOrder(): OrderState {
    this._state = createInitialOrderState();
    this.notify();
    return this._state;
  }

  subscribe(listener: (state: OrderState) => void): () => void {
    this.listeners.add(listener);
    listener(this._state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this._state);
    }
  }
}
