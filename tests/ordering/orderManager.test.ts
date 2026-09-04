import { describe, it, expect, beforeEach } from 'vitest';
import { ConcreteOrderManager } from '../../src/services/order/orderManager';
import { OrderAction } from '../../src/services/order/types';

describe('OrderManager', () => {
  let manager: ConcreteOrderManager;

  beforeEach(() => {
    manager = new ConcreteOrderManager();
  });

  it('adds a new item', () => {
    manager.applyAction({
      type: 'ADD_ITEM',
      menuItemId: 'biryani-chicken-dum',
      name: 'Chicken Biryani',
      quantity: 2,
      spiceLevel: 'spicy'
    });

    const state = manager.state;
    expect(state.items.length).toBe(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.items[0].customization.spiceLevel).toBe('spicy');
  });

  it('adds same item again and increments quantity', () => {
    manager.applyAction({
      type: 'ADD_ITEM',
      menuItemId: 'biryani-chicken-dum',
      name: 'Chicken Biryani',
      quantity: 2,
      spiceLevel: 'spicy'
    });

    manager.applyAction({
      type: 'ADD_ITEM',
      menuItemId: 'biryani-chicken-dum',
      name: 'Chicken Biryani',
      quantity: 1,
      spiceLevel: 'spicy'
    });

    const state = manager.state;
    expect(state.items.length).toBe(1);
    expect(state.items[0].quantity).toBe(3);
  });

  it('updates customization', () => {
    manager.applyAction({
      type: 'ADD_ITEM',
      menuItemId: 'biryani-chicken-dum',
      quantity: 1,
      spiceLevel: 'spicy'
    });

    const cartItemId = manager.state.items[0].id;
    manager.applyAction({
      type: 'UPDATE_CUSTOMIZATION',
      cartItemId: cartItemId,
      spiceLevel: 'mild'
    });

    expect(manager.state.items[0].customization.spiceLevel).toBe('mild');
  });

  it('updates quantity', () => {
    manager.applyAction({
      type: 'ADD_ITEM',
      menuItemId: 'biryani-chicken-dum',
      quantity: 2,
    });

    const cartItemId = manager.state.items[0].id;
    manager.applyAction({
      type: 'UPDATE_QUANTITY',
      cartItemId: cartItemId,
      quantity: 1
    });

    expect(manager.state.items[0].quantity).toBe(1);
  });

  it('removes item', () => {
    manager.applyAction({
      type: 'ADD_ITEM',
      menuItemId: 'biryani-chicken-dum',
      quantity: 1,
    });

    const cartItemId = manager.state.items[0].id;
    manager.applyAction({
      type: 'REMOVE_ITEM',
      cartItemId: cartItemId
    });

    expect(manager.state.items.length).toBe(0);
  });

  it('clears order', () => {
    manager.applyAction({ type: 'ADD_ITEM', menuItemId: 'bev-coke', quantity: 1 });
    manager.applyAction({ type: 'ADD_ITEM', menuItemId: 'bread-garlic-naan', quantity: 2 });
    expect(manager.state.items.length).toBe(2);

    manager.applyAction({ type: 'CLEAR_ORDER' });
    expect(manager.state.items.length).toBe(0);
  });
});
