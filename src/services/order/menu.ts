import { MenuItem } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'biryani-chicken-dum',
    name: 'Royal Chicken Dum Biryani',
    description: 'Slow-cooked marinated chicken layered with aromatic aged basmati rice, saffron, caramelised onions, and fresh mint.',
    category: 'biryani',
    price: 349,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    defaultSpiceLevel: 'medium',
    allowSpiceCustomization: true,
    availableOptions: [
      { name: 'Extra Raita', price: 40 },
      { name: 'Extra Salan Gravy', price: 40 },
      { name: 'Double Chicken', price: 120 },
      { name: 'Boiled Egg (2 pcs)', price: 50 }
    ],
    tags: ['Bestseller', 'Halal', 'Chef Special'],
    popular: true,
  },
  {
    id: 'biryani-lamb-shank',
    name: 'Hyderabadi Lamb Biryani',
    description: 'Tender spiced lamb cuts infused with royal shahi garam masala, cardamom, and slow-dum basmati rice.',
    category: 'biryani',
    price: 499,
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80',
    defaultSpiceLevel: 'spicy',
    allowSpiceCustomization: true,
    availableOptions: [
      { name: 'Extra Mint Raita', price: 40 },
      { name: 'Extra Salan Gravy', price: 40 }
    ],
    tags: ['Signature', 'Spicy'],
    popular: true,
  },
  {
    id: 'biryani-paneer-veg',
    name: 'Nawabi Paneer & Veg Biryani',
    description: 'Fresh grilled cottage cheese cubes, garden vegetables, saffron rice, and crispy fried shallots.',
    category: 'biryani',
    price: 299,
    image: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=600&auto=format&fit=crop&q=80',
    defaultSpiceLevel: 'medium',
    allowSpiceCustomization: true,
    availableOptions: [
      { name: 'Extra Paneer', price: 80 },
      { name: 'Extra Raita', price: 40 }
    ],
    tags: ['Vegetarian', 'Popular'],
    popular: true,
  },
  {
    id: 'bowl-butter-chicken',
    name: 'Butter Chicken Rice Bowl',
    description: 'Tandoori chicken simmered in rich creamy tomato butter makhani gravy over warm cumin basmati rice.',
    category: 'bowls',
    price: 329,
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80',
    defaultSpiceLevel: 'mild',
    allowSpiceCustomization: true,
    availableOptions: [
      { name: 'Butter Naan on Side', price: 60 },
      { name: 'Extra Chicken', price: 90 }
    ],
    tags: ['Comfort Food', 'Mild'],
    popular: true,
  },
  {
    id: 'bowl-tikka-masala',
    name: 'Paneer Tikka Masala Bowl',
    description: 'Smoked paneer with bell peppers, onions in spiced onion-tomato curry over fragrant turmeric rice.',
    category: 'bowls',
    price: 289,
    image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80',
    defaultSpiceLevel: 'medium',
    allowSpiceCustomization: true,
    availableOptions: [
      { name: 'Garlic Naan on Side', price: 70 }
    ],
    tags: ['Vegetarian'],
  },
  {
    id: 'street-samosa-trio',
    name: 'Crispy Samosa Trio',
    description: 'Golden flaky pastries filled with spiced potatoes, green peas, served with sweet tamarind & mint chutneys.',
    category: 'street_eats',
    price: 149,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    defaultSpiceLevel: 'mild',
    allowSpiceCustomization: false,
    availableOptions: [
      { name: 'Extra Chutney Dip', price: 25 }
    ],
    tags: ['Appetizer', 'Vegan'],
    popular: true,
  },
  {
    id: 'street-chicken-65',
    name: 'Spicy Chicken 65',
    description: 'South Indian crisp-fried boneless chicken tossed with curry leaves, cracked black pepper, and fiery red chili.',
    category: 'street_eats',
    price: 249,
    image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80',
    defaultSpiceLevel: 'spicy',
    allowSpiceCustomization: true,
    availableOptions: [],
    tags: ['Fiery', 'Street Favorite'],
    popular: true,
  },
  {
    id: 'bread-garlic-naan',
    name: 'Garlic Butter Naan',
    description: 'Fresh tandoor-baked flatbread brushed with crushed roasted garlic, melted butter, and fresh cilantro.',
    category: 'breads',
    price: 70,
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80',
    allowSpiceCustomization: false,
    availableOptions: [
      { name: 'Extra Butter', price: 15 }
    ],
    tags: ['Vegetarian'],
    popular: true,
  },
  {
    id: 'bev-coke',
    name: 'Coca-Cola (Can 355ml)',
    description: 'Chilled refreshing classic Coca-Cola.',
    category: 'beverages',
    price: 60,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    allowSpiceCustomization: false,
    availableOptions: [
      { name: 'Cup of Ice', price: 0 }
    ],
    tags: ['Beverage'],
    popular: true,
  },
  {
    id: 'bev-diet-coke',
    name: 'Diet Coke (Can 355ml)',
    description: 'Crisp zero-calorie chilled Diet Coke.',
    category: 'beverages',
    price: 60,
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&auto=format&fit=crop&q=80',
    allowSpiceCustomization: false,
    availableOptions: [
      { name: 'Cup of Ice', price: 0 }
    ],
    tags: ['Beverage'],
  },
  {
    id: 'bev-mango-lassi',
    name: 'Alphonso Mango Lassi',
    description: 'Thick creamy churned yogurt drink sweetened with pure organic Alphonso mango pulp and crushed pistachio.',
    category: 'beverages',
    price: 120,
    image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80',
    allowSpiceCustomization: false,
    availableOptions: [],
    tags: ['Sweet', 'Chef Favorite'],
    popular: true,
  },
  {
    id: 'dessert-gulab-jamun',
    name: 'Warm Gulab Jamun (2 pcs)',
    description: 'Soft golden milk dumplings soaked in fragrant green cardamom and rosewater saffron syrup.',
    category: 'desserts',
    price: 99,
    image: 'https://images.unsplash.com/photo-1667205423854-e6997b6131c7?w=600&auto=format&fit=crop&q=80',
    allowSpiceCustomization: false,
    availableOptions: [],
    tags: ['Sweet', 'Dessert'],
    popular: true,
  }
];

export function findMenuItemByNameOrQuery(query: string): MenuItem | undefined {
  const q = query.toLowerCase().trim();
  if (!q) return undefined;

  // Direct ID check
  const byId = MENU_ITEMS.find(m => m.id === q);
  if (byId) return byId;

  // Exact name match
  const byExact = MENU_ITEMS.find(m => m.name.toLowerCase() === q);
  if (byExact) return byExact;

  // Keyword priority matching
  if (q.includes('chicken biryani') || q.includes('chicken dum') || (q.includes('chicken') && q.includes('biryani'))) {
    return MENU_ITEMS.find(m => m.id === 'biryani-chicken-dum');
  }
  if (q.includes('lamb') || q.includes('mutton')) {
    return MENU_ITEMS.find(m => m.id === 'biryani-lamb-shank');
  }
  if (q.includes('veg biryani') || q.includes('paneer biryani')) {
    return MENU_ITEMS.find(m => m.id === 'biryani-paneer-veg');
  }
  if (q.includes('butter chicken')) {
    return MENU_ITEMS.find(m => m.id === 'bowl-butter-chicken');
  }
  if (q.includes('tikka masala') || q.includes('paneer bowl')) {
    return MENU_ITEMS.find(m => m.id === 'bowl-tikka-masala');
  }
  if (q.includes('chicken 65')) {
    return MENU_ITEMS.find(m => m.id === 'street-chicken-65');
  }
  if (q.includes('samosa')) {
    return MENU_ITEMS.find(m => m.id === 'street-samosa-trio');
  }
  if (q.includes('naan') || q.includes('garlic naan')) {
    return MENU_ITEMS.find(m => m.id === 'bread-garlic-naan');
  }
  if (q.includes('diet coke')) {
    return MENU_ITEMS.find(m => m.id === 'bev-diet-coke');
  }
  if (q.includes('coke') || q.includes('coca cola') || q.includes('soda')) {
    return MENU_ITEMS.find(m => m.id === 'bev-coke');
  }
  if (q.includes('mango') || q.includes('lassi')) {
    return MENU_ITEMS.find(m => m.id === 'bev-mango-lassi');
  }
  if (q.includes('gulab') || q.includes('jamun') || q.includes('dessert')) {
    return MENU_ITEMS.find(m => m.id === 'dessert-gulab-jamun');
  }

  // General partial match
  return MENU_ITEMS.find(m => 
    m.name.toLowerCase().includes(q) || 
    m.description.toLowerCase().includes(q) ||
    m.tags?.some(t => t.toLowerCase().includes(q))
  );
}
