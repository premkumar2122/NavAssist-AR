'use strict';
const { v4: uuid } = require('uuid');

/*
  HOW PRODUCT LOCATIONS WORK
  ──────────────────────────
  Every product has a `nodeId` field.
  This nodeId is a key in the NAVIGATION GRAPH (navigationGraph.js).
  The graph node stores the exact physical position in the store.

  When a shopkeeper moves a product:
    1. They change `nodeId` in the admin panel
    2. Backend saves the new nodeId
    3. Backend broadcasts the update to all connected Android apps via WebSocket
    4. Android app rebuilds the route using the new nodeId → new path is computed

  The turn-by-turn directions (forward/left/right/backward/steps) come from
  the EDGES of the navigation graph, not from this file.
*/

let STORE = {
  info: {
    id: 'BIGMART_S12_HYD',
    name: 'BigMart',
    branch: 'Sector 12, Hyderabad',
    address: 'Plot 4A, Sector 12, ECIL, Hyderabad 500062',
    phone: '+91 40 2345 6789',
    emergencyPhone: '100',
    entranceFacing: 'SOUTH',
    checkoutSteps: 110,
    version: 1,
  },

  zones: {
    ZONE_DAIRY: {
      id: 'ZONE_DAIRY',
      name: 'Dairy',
      shortName: 'Dairy',
      aisles: ['D1', 'D2', 'D3'],
      stepsFromEntrance: 38,
      sensory: 'Refrigerator hum, cool air, white tiled floor',
    },
    ZONE_BAKERY: {
      id: 'ZONE_BAKERY',
      name: 'Bakery',
      shortName: 'Bakery',
      aisles: ['BK1'],
      stepsFromEntrance: 68,
      sensory: 'Warm fresh bread smell, soft floor mat',
    },
    ZONE_BEVERAGES: {
      id: 'ZONE_BEVERAGES',
      name: 'Beverages',
      shortName: 'Beverages',
      aisles: ['B1', 'B2', 'B3', 'B4'],
      stepsFromEntrance: 65,
      sensory: 'Refrigerator hum on left wall, glass doors, cold drafts',
    },
    ZONE_PERSONAL_CARE: {
      id: 'ZONE_PERSONAL_CARE',
      name: 'Personal Care',
      shortName: 'Personal',
      aisles: ['P1', 'P2'],
      stepsFromEntrance: 75,
      sensory: 'Fragrance of shampoos and soaps',
    },
    ZONE_SNACKS: {
      id: 'ZONE_SNACKS',
      name: 'Snacks',
      shortName: 'Snacks',
      aisles: ['S1', 'S2'],
      stepsFromEntrance: 72,
      sensory: 'Crinkle of plastic packets, salty smell',
    },
    ZONE_GRAINS: {
      id: 'ZONE_GRAINS',
      name: 'Grains and Pulses',
      shortName: 'Grains',
      aisles: ['GR1', 'GR2'],
      stepsFromEntrance: 50,
      sensory: 'Heavy bags at floor level, faint grain smell',
    },
    ZONE_GROCERY: {
      id: 'ZONE_GROCERY',
      name: 'Grocery and Spices',
      shortName: 'Grocery',
      aisles: ['G1', 'G2'],
      stepsFromEntrance: 58,
      sensory: 'Spice aroma, medium weight packages',
    },
    ZONE_PRODUCE: {
      id: 'ZONE_PRODUCE',
      name: 'Fresh Produce',
      shortName: 'Produce',
      aisles: ['PR1'],
      stepsFromEntrance: 35,
      sensory: 'Cool mist, fresh vegetable smell',
    },
    ZONE_CHECKOUT: {
      id: 'ZONE_CHECKOUT',
      name: 'Checkout',
      shortName: 'Checkout',
      aisles: ['C1', 'C2', 'C3'],
      stepsFromEntrance: 110,
      sensory: 'Beeping of barcode scanners, conveyor belt sounds',
    },
  },

  // nodeId links each product to a position in the navigation graph
  products: {
    PROD_MILK: {
      id: 'PROD_MILK', key: 'milk',
      name: 'Amul Full Cream Milk', brand: 'Amul', size: '1L',
      emoji: '🥛', zone: 'ZONE_DAIRY', aisle: 'D3',
      nodeId: 'DAIRY_D3_SHELF2',
      shelfRow: 4, shelfPos: 2,
      bodyHeight: 'chest height', bodyDir: 'second from left',
      price: 62, inStock: true,
      desc: 'White and blue rectangular carton. Feels firm and cold. Amul logo in red. Flip-top cap at the top.',
    },
    PROD_BUTTER: {
      id: 'PROD_BUTTER', key: 'butter',
      name: 'Amul Butter', brand: 'Amul', size: '500g',
      emoji: '🧈', zone: 'ZONE_DAIRY', aisle: 'D2',
      nodeId: 'DAIRY_D2_SHELF4',
      shelfRow: 4, shelfPos: 1,
      bodyHeight: 'chest height', bodyDir: 'first on the left',
      price: 55, inStock: true,
      desc: 'Small yellow and red foil wrapper. Feels like a soft firm brick.',
    },
    PROD_EGGS: {
      id: 'PROD_EGGS', key: 'eggs',
      name: 'Farm Fresh Eggs', brand: 'Farm Fresh', size: '12 pack',
      emoji: '🥚', zone: 'ZONE_DAIRY', aisle: 'D1',
      nodeId: 'DAIRY_D1_SHELF3',
      shelfRow: 3, shelfPos: 3,
      bodyHeight: 'waist height', bodyDir: 'third from left',
      price: 84, inStock: true,
      desc: 'White cardboard box, bumpy top. Red Farm Fresh label. Handle with care.',
    },
    PROD_BREAD: {
      id: 'PROD_BREAD', key: 'bread',
      name: 'Britannia Brown Bread', brand: 'Britannia', size: '400g',
      emoji: '🍞', zone: 'ZONE_BAKERY', aisle: 'BK1',
      nodeId: 'BAKERY_BK1_SHELF3',
      shelfRow: 3, shelfPos: 2,
      bodyHeight: 'waist height', bodyDir: 'second from left',
      price: 45, inStock: true,
      desc: 'Soft crinkly plastic bag. Brown bread inside. Light and squishy.',
    },
    PROD_RICE: {
      id: 'PROD_RICE', key: 'rice',
      name: 'India Gate Basmati Rice', brand: 'India Gate', size: '5kg',
      emoji: '🌾', zone: 'ZONE_GRAINS', aisle: 'GR2',
      nodeId: 'GRAINS_GR2_FLOOR1',
      shelfRow: 1, shelfPos: 1,
      bodyHeight: 'floor level', bodyDir: 'first on the left',
      price: 480, inStock: true,
      desc: 'Large white bag, very heavy. Green and gold India Gate logo. Rough fabric texture.',
    },
    PROD_SHAMPOO: {
      id: 'PROD_SHAMPOO', key: 'shampoo',
      name: 'Head and Shoulders Shampoo', brand: 'Head and Shoulders', size: '340ml',
      emoji: '🧴', zone: 'ZONE_PERSONAL_CARE', aisle: 'P2',
      nodeId: 'PERSONAL_P2_SHELF4',
      shelfRow: 4, shelfPos: 3,
      bodyHeight: 'chest height', bodyDir: 'third from left',
      price: 299, inStock: true,
      desc: 'Blue plastic bottle with white flip cap. Smooth cylindrical bottle.',
    },
    PROD_SOAP: {
      id: 'PROD_SOAP', key: 'soap',
      name: 'Dettol Soap', brand: 'Dettol', size: '100g',
      emoji: '🧼', zone: 'ZONE_PERSONAL_CARE', aisle: 'P1',
      nodeId: 'PERSONAL_P1_SHELF3',
      shelfRow: 3, shelfPos: 1,
      bodyHeight: 'waist height', bodyDir: 'first on the left',
      price: 45, inStock: true,
      desc: 'Green and white paper wrapper. Rectangular bar. Strong antiseptic smell.',
    },
    PROD_WATER: {
      id: 'PROD_WATER', key: 'water',
      name: 'Bisleri Mineral Water', brand: 'Bisleri', size: '1L',
      emoji: '💧', zone: 'ZONE_BEVERAGES', aisle: 'B3',
      nodeId: 'BEV_B3_SHELF4',
      shelfRow: 4, shelfPos: 2,
      bodyHeight: 'chest height', bodyDir: 'second from left',
      price: 20, inStock: true,
      desc: 'Clear plastic bottle, blue Bisleri label. Smooth and cold when refrigerated.',
    },
    PROD_COFFEE: {
      id: 'PROD_COFFEE', key: 'coffee',
      name: 'Nescafe Classic Coffee', brand: 'Nescafe', size: '200g',
      emoji: '☕', zone: 'ZONE_BEVERAGES', aisle: 'B1',
      nodeId: 'BEV_B1_SHELF5',
      shelfRow: 5, shelfPos: 1,
      bodyHeight: 'eye height', bodyDir: 'first on the left',
      price: 340, inStock: true,
      desc: 'Dark red glass jar, gold metal lid. Strong roasted coffee aroma.',
    },
    PROD_TEA: {
      id: 'PROD_TEA', key: 'tea',
      name: 'Tata Tea Premium', brand: 'Tata Tea', size: '500g',
      emoji: '🍵', zone: 'ZONE_BEVERAGES', aisle: 'B2',
      nodeId: 'BEV_B2_SHELF3',
      shelfRow: 3, shelfPos: 2,
      bodyHeight: 'waist height', bodyDir: 'second from left',
      price: 175, inStock: true,
      desc: 'Red and white rectangular box. Light and papery.',
    },
    PROD_CHIPS: {
      id: 'PROD_CHIPS', key: 'chips',
      name: 'Lays Classic Salted Chips', brand: 'Lays', size: '52g',
      emoji: '🍟', zone: 'ZONE_SNACKS', aisle: 'S1',
      nodeId: 'SNACKS_S1_SHELF4',
      shelfRow: 4, shelfPos: 3,
      bodyHeight: 'chest height', bodyDir: 'third from left',
      price: 30, inStock: true,
      desc: 'Yellow crinkled plastic packet. Very light. Makes rustling sound.',
    },
    PROD_BISCUIT: {
      id: 'PROD_BISCUIT', key: 'biscuit',
      name: 'Parle-G Biscuits', brand: 'Parle-G', size: '800g',
      emoji: '🍪', zone: 'ZONE_SNACKS', aisle: 'S2',
      nodeId: 'SNACKS_S2_SHELF2',
      shelfRow: 2, shelfPos: 1,
      bodyHeight: 'knee height', bodyDir: 'first on the left',
      price: 55, inStock: true,
      desc: 'Yellow wrapper with child image. Rectangular package.',
    },
    PROD_OIL: {
      id: 'PROD_OIL', key: 'oil',
      name: 'Fortune Sunflower Oil', brand: 'Fortune', size: '1L',
      emoji: '🫙', zone: 'ZONE_GROCERY', aisle: 'G1',
      nodeId: 'GROCERY_G1_SHELF4',
      shelfRow: 4, shelfPos: 2,
      bodyHeight: 'chest height', bodyDir: 'second from left',
      price: 180, inStock: true,
      desc: 'Yellow plastic bottle. Fortune in red text. Slightly oily on outside.',
    },
    PROD_SUGAR: {
      id: 'PROD_SUGAR', key: 'sugar',
      name: 'Tata Sugar', brand: 'Tata', size: '1kg',
      emoji: '🍚', zone: 'ZONE_GROCERY', aisle: 'G1',
      nodeId: 'GROCERY_G1_SHELF3',
      shelfRow: 3, shelfPos: 3,
      bodyHeight: 'waist height', bodyDir: 'third from left',
      price: 52, inStock: true,
      desc: 'White plastic bag. Tata logo in blue and red. Feels grainy.',
    },
    PROD_SALT: {
      id: 'PROD_SALT', key: 'salt',
      name: 'Tata Salt', brand: 'Tata', size: '1kg',
      emoji: '🧂', zone: 'ZONE_GROCERY', aisle: 'G1',
      nodeId: 'GROCERY_G1_SHELF5',
      shelfRow: 5, shelfPos: 1,
      bodyHeight: 'eye height', bodyDir: 'first on the left',
      price: 25, inStock: true,
      desc: 'White bag. Tata Salt in large blue letters. Small compact package.',
    },
    PROD_FLOUR: {
      id: 'PROD_FLOUR', key: 'flour',
      name: 'Aashirvaad Atta', brand: 'Aashirvaad', size: '5kg',
      emoji: '🌾', zone: 'ZONE_GRAINS', aisle: 'GR1',
      nodeId: 'GRAINS_GR1_FLOOR1',
      shelfRow: 1, shelfPos: 2,
      bodyHeight: 'floor level', bodyDir: 'second from left',
      price: 270, inStock: true,
      desc: 'Green bag with red Aashirvaad logo. Heavy and soft. Flour smell.',
    },
    PROD_DAL: {
      id: 'PROD_DAL', key: 'dal',
      name: 'Toor Dal', brand: 'Tata Sampann', size: '1kg',
      emoji: '🫘', zone: 'ZONE_GRAINS', aisle: 'GR2',
      nodeId: 'GRAINS_GR2_SHELF3',
      shelfRow: 3, shelfPos: 1,
      bodyHeight: 'waist height', bodyDir: 'first on the left',
      price: 115, inStock: true,
      desc: 'Clear plastic bag. Yellow lentils visible inside. Rough bag texture.',
    },
    PROD_NOODLES: {
      id: 'PROD_NOODLES', key: 'noodles',
      name: 'Maggi Noodles', brand: 'Maggi', size: '420g',
      emoji: '🍜', zone: 'ZONE_GROCERY', aisle: 'G2',
      nodeId: 'GROCERY_G2_SHELF4',
      shelfRow: 4, shelfPos: 2,
      bodyHeight: 'chest height', bodyDir: 'second from left',
      price: 75, inStock: true,
      desc: 'Yellow and red rectangular box. Maggi in bold. Light cardboard.',
    },
    PROD_JUICE: {
      id: 'PROD_JUICE', key: 'juice',
      name: 'Real Mixed Fruit Juice', brand: 'Real', size: '1L',
      emoji: '🧃', zone: 'ZONE_BEVERAGES', aisle: 'B4',
      nodeId: 'BEV_B4_SHELF3',
      shelfRow: 3, shelfPos: 2,
      bodyHeight: 'waist height', bodyDir: 'second from left',
      price: 110, inStock: true,
      desc: 'Colourful carton with fruit pictures. Real brand. Tetrapak style.',
    },

    // Special destination — not a product but navigable
    PROD_CHECKOUT: {
      id: 'PROD_CHECKOUT', key: 'checkout',
      name: 'Checkout Counter', brand: 'BigMart', size: '',
      emoji: '💳', zone: 'ZONE_CHECKOUT', aisle: 'C1',
      nodeId: 'CHECKOUT_AREA',
      shelfRow: 0, shelfPos: 0,
      bodyHeight: 'waist height', bodyDir: 'straight ahead',
      price: 0, inStock: true,
      desc: 'Checkout counters. Place your basket on the conveyor belt. Staff will scan your items. You will hear scanner beeps.',
    },
  },

  landmarks: [
    { steps: 10,  text: 'Trolley bay on your right. Store map kiosk 2 steps ahead.' },
    { steps: 25,  text: 'Floor changes to textured anti-slip tiles. Produce smell on your left.' },
    { steps: 40,  text: 'Dairy refrigerator hum on your left. Air gets cooler.' },
    { steps: 55,  text: 'Grains section. Heavy bags at floor level ahead.' },
    { steps: 70,  text: 'Mid-store. Beverages hum on left, Snacks on right.' },
    { steps: 105, text: 'Checkout area ahead. Scanner beeps audible.' },
  ],
};

// ── CRUD ─────────────────────────────────────────────────────────
const db = {
  getAll:      ()     => STORE,
  getInfo:     ()     => STORE.info,
  getZones:    ()     => STORE.zones,
  getProducts: ()     => STORE.products,
  getLandmarks:()     => STORE.landmarks,
  getVersion:  ()     => STORE.info.version,

  bumpVersion: ()     => { STORE.info.version++; return STORE.info.version; },

  updateInfo: (data)  => { Object.assign(STORE.info, data); db.bumpVersion(); return STORE.info; },

  addProduct: (data)  => {
    const id = data.id || ('PROD_' + uuid().slice(0, 8).toUpperCase());
    STORE.products[id] = { ...data, id };
    db.bumpVersion();
    return STORE.products[id];
  },
  updateProduct: (id, data) => {
    if (!STORE.products[id]) return null;
    Object.assign(STORE.products[id], data);
    db.bumpVersion();
    return STORE.products[id];
  },
  deleteProduct: (id) => { delete STORE.products[id]; db.bumpVersion(); return true; },

  addZone: (data) => {
    const id = data.id || ('ZONE_' + uuid().slice(0, 8).toUpperCase());
    STORE.zones[id] = { ...data, id };
    db.bumpVersion();
    return STORE.zones[id];
  },
  updateZone: (id, data) => {
    if (!STORE.zones[id]) return null;
    Object.assign(STORE.zones[id], data);
    db.bumpVersion();
    return STORE.zones[id];
  },
  deleteZone: (id) => { delete STORE.zones[id]; db.bumpVersion(); return true; },

  addLandmark: (data) => {
    STORE.landmarks.push(data);
    STORE.landmarks.sort((a, b) => a.steps - b.steps);
    db.bumpVersion();
    return data;
  },
  deleteLandmark: (idx) => { STORE.landmarks.splice(idx, 1); db.bumpVersion(); return true; },

  searchProducts: (q) => {
    const lc = (q || '').toLowerCase();
    return Object.values(STORE.products).filter(p =>
      p.name.toLowerCase().includes(lc) ||
      p.key.toLowerCase().includes(lc) ||
      p.brand.toLowerCase().includes(lc)
    );
  },
};

module.exports = db;
