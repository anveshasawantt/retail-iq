/**
 * Seed data for ApexRetail OS (Indian Retail Edition)
 * Authentic FMCG & grocery catalog in Indian Rupees (INR - ₹)
 */

export const SEED_PRODUCTS = [
  {
    id: "prod-001",
    barcode: "8901262010053",
    sku: "DAI-AML-01",
    name: "Amul Taaza Toned Milk (1 Litre)",
    brand: "Amul",
    category: "Dairy & Breakfast",
    sellingPrice: 72,
    costPrice: 58,
    currentStock: 8, // Low stock on purpose for instant demo
    minSafetyStock: 25,
    supplierLeadTimeDays: 1,
    reorderPackSize: 24,
    supplierName: "Gujarat Co-op Milk Federation (Amul)",
    supplierEmail: "dispatch@amul.coop",
    unit: "pouch",
    description: "Pasteurised toned milk with 3.0% fat and 8.5% SNF."
  },
  {
    id: "prod-002",
    barcode: "8901030382012",
    sku: "ATT-AAS-02",
    name: "Aashirvaad Shudh Chakki Atta (5kg)",
    brand: "Aashirvaad",
    category: "Staples & Grains",
    sellingPrice: 265,
    costPrice: 215,
    currentStock: 12,
    minSafetyStock: 20,
    supplierLeadTimeDays: 2,
    reorderPackSize: 10,
    supplierName: "ITC Distribution Hub",
    supplierEmail: "orders.fmcg@itc.in",
    unit: "bag",
    description: "100% pure whole wheat flour processed with traditional chakki grinding."
  },
  {
    id: "prod-003",
    barcode: "8901052002014",
    sku: "BEV-TAT-03",
    name: "Tata Tea Gold Leaf Tea (500g)",
    brand: "Tata Tea",
    category: "Beverages",
    sellingPrice: 310,
    costPrice: 245,
    currentStock: 16,
    minSafetyStock: 15,
    supplierLeadTimeDays: 3,
    reorderPackSize: 12,
    supplierName: "Tata Consumer Products Depot",
    supplierEmail: "supply@tataconsumer.com",
    unit: "pack",
    description: "Gently rolled aromatic long leaves with premium Assam CTC tea."
  },
  {
    id: "prod-004",
    barcode: "8906007280014",
    sku: "OIL-FOR-04",
    name: "Fortune Sunlite Refined Sunflower Oil (1L)",
    brand: "Fortune",
    category: "Edible Oils",
    sellingPrice: 145,
    costPrice: 118,
    currentStock: 9, // Low stock trigger
    minSafetyStock: 20,
    supplierLeadTimeDays: 2,
    reorderPackSize: 16,
    supplierName: "Adani Wilmar Supply Node",
    supplierEmail: "fmcg.orders@adaniwilmar.in",
    unit: "pouch",
    description: "Refined sunflower oil enriched with Vitamins A and D."
  },
  {
    id: "prod-005",
    barcode: "8901058852309",
    sku: "INS-MAG-05",
    name: "Maggi 2-Minute Masala Noodles (4-Pack, 280g)",
    brand: "Maggi",
    category: "Packaged Foods",
    sellingPrice: 56,
    costPrice: 44,
    currentStock: 45,
    minSafetyStock: 30,
    supplierLeadTimeDays: 2,
    reorderPackSize: 24,
    supplierName: "Nestle India Regional Depot",
    supplierEmail: "sales@in.nestle.com",
    unit: "pack",
    description: "Instant noodles with authentic Indian roast spices blend."
  },
  {
    id: "prod-006",
    barcode: "8901719101051",
    sku: "BIS-PAR-06",
    name: "Parle-G Original Glucose Biscuits (250g)",
    brand: "Parle",
    category: "Bakery & Snacks",
    sellingPrice: 25,
    costPrice: 19,
    currentStock: 60,
    minSafetyStock: 40,
    supplierLeadTimeDays: 1,
    reorderPackSize: 50,
    supplierName: "Parle Products Agency",
    supplierEmail: "dispatch@parle.biz",
    unit: "pack",
    description: "Iconic wheat and milk glucose energy biscuits."
  },
  {
    id: "prod-007",
    barcode: "8901063012015",
    sku: "BIS-BRI-07",
    name: "Britannia Good Day Butter Cookies (200g)",
    brand: "Britannia",
    category: "Bakery & Snacks",
    sellingPrice: 40,
    costPrice: 31,
    currentStock: 34,
    minSafetyStock: 25,
    supplierLeadTimeDays: 2,
    reorderPackSize: 30,
    supplierName: "Britannia Industries Hub",
    supplierEmail: "orders@britannia.co.in",
    unit: "pack",
    description: "Rich butter cookies with delightful crunchy baked bite."
  },
  {
    id: "prod-008",
    barcode: "8904004400123",
    sku: "SNK-HAL-08",
    name: "Haldiram's Nagpur Aloo Bhujia (400g)",
    brand: "Haldiram's",
    category: "Packaged Foods",
    sellingPrice: 115,
    costPrice: 88,
    currentStock: 28,
    minSafetyStock: 15,
    supplierLeadTimeDays: 3,
    reorderPackSize: 20,
    supplierName: "Haldiram Snacks Distributors",
    supplierEmail: "orders@haldiram.com",
    unit: "pack",
    description: "Crispy spicy potato and moth flour sev with mint seasonings."
  },
  {
    id: "prod-009",
    barcode: "8901030012018",
    sku: "HOU-SRF-09",
    name: "Surf Excel Easy Wash Detergent Powder (1kg)",
    brand: "Surf Excel",
    category: "Household & Cleaning",
    sellingPrice: 135,
    costPrice: 104,
    currentStock: 22,
    minSafetyStock: 15,
    supplierLeadTimeDays: 3,
    reorderPackSize: 12,
    supplierName: "Hindustan Unilever Depot",
    supplierEmail: "hul.fmcg@unilever.com",
    unit: "pouch",
    description: "Advanced stain-removal laundry powder with low lather rinse."
  },
  {
    id: "prod-010",
    barcode: "8901396112018",
    sku: "PER-DET-10",
    name: "Dettol Liquid Handwash Refill (175ml)",
    brand: "Dettol",
    category: "Personal Care",
    sellingPrice: 85,
    costPrice: 62,
    currentStock: 19,
    minSafetyStock: 15,
    supplierLeadTimeDays: 2,
    reorderPackSize: 24,
    supplierName: "Reckitt Benckiser Logistics",
    supplierEmail: "orders@reckitt.com",
    unit: "pouch",
    description: "Antibacterial germ protection liquid hand sanitizer wash."
  },
  {
    id: "prod-011",
    barcode: "8901207012012",
    sku: "STP-DAB-11",
    name: "Dabur 100% Pure Honey Squeezy (400g)",
    brand: "Dabur",
    category: "Staples & Grains",
    sellingPrice: 199,
    costPrice: 150,
    currentStock: 40,
    minSafetyStock: 10,
    supplierLeadTimeDays: 4,
    reorderPackSize: 12,
    supplierName: "Dabur India Depot",
    supplierEmail: "orders@dabur.com",
    unit: "bottle",
    description: "NMR tested 100% pure natural honey with no added sugar."
  },
  {
    id: "prod-012",
    barcode: "8901058862018",
    sku: "BEV-NES-12",
    name: "Nescafe Classic Instant Coffee Jar (100g)",
    brand: "Nescafe",
    category: "Beverages",
    sellingPrice: 340,
    costPrice: 265,
    currentStock: 7, // Low stock trigger
    minSafetyStock: 15,
    supplierLeadTimeDays: 3,
    reorderPackSize: 12,
    supplierName: "Nestle India Regional Depot",
    supplierEmail: "sales@in.nestle.com",
    unit: "jar",
    description: "100% pure natural coffee beans roasted to signature aroma."
  }
];

const getDateDaysAgo = (daysAgo, hourOffset = 11, minuteOffset = 20) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hourOffset, minuteOffset, 0, 0);
  return date.toISOString();
};

export const SEED_TRANSACTIONS = [
  {
    id: "TXN-9021",
    timestamp: getDateDaysAgo(0, 10, 15),
    cashierName: "Rajesh Sharma",
    registerId: "POS-01",
    paymentMethod: "UPI",
    subtotal: 549,
    tax: 27.45,
    total: 576.45,
    items: [
      { productId: "prod-001", barcode: "8901262010053", name: "Amul Taaza Toned Milk (1 Litre)", unitPrice: 72, quantity: 2, lineTotal: 144 },
      { productId: "prod-002", barcode: "8901030382012", name: "Aashirvaad Shudh Chakki Atta (5kg)", unitPrice: 265, quantity: 1, lineTotal: 265 },
      { productId: "prod-004", barcode: "8906007280014", name: "Fortune Sunlite Refined Sunflower Oil (1L)", unitPrice: 145, quantity: 1, lineTotal: 145 }
    ]
  },
  {
    id: "TXN-9020",
    timestamp: getDateDaysAgo(0, 12, 45),
    cashierName: "Priya Patel",
    registerId: "POS-02",
    paymentMethod: "Cash",
    subtotal: 391,
    tax: 19.55,
    total: 410.55,
    items: [
      { productId: "prod-003", barcode: "8901052002014", name: "Tata Tea Gold Leaf Tea (500g)", unitPrice: 310, quantity: 1, lineTotal: 310 },
      { productId: "prod-006", barcode: "8901719101051", name: "Parle-G Original Glucose Biscuits (250g)", unitPrice: 25, quantity: 1, lineTotal: 25 },
      { productId: "prod-005", barcode: "8901058852309", name: "Maggi 2-Minute Masala Noodles (4-Pack, 280g)", unitPrice: 56, quantity: 1, lineTotal: 56 }
    ]
  },
  {
    id: "TXN-9019",
    timestamp: getDateDaysAgo(1, 15, 30),
    cashierName: "Rajesh Sharma",
    registerId: "POS-01",
    paymentMethod: "UPI",
    subtotal: 680,
    tax: 34.00,
    total: 714.00,
    items: [
      { productId: "prod-012", barcode: "8901058862018", name: "Nescafe Classic Instant Coffee Jar (100g)", unitPrice: 340, quantity: 2, lineTotal: 680 }
    ]
  },
  {
    id: "TXN-9018",
    timestamp: getDateDaysAgo(2, 11, 10),
    cashierName: "Priya Patel",
    registerId: "POS-02",
    paymentMethod: "Card",
    subtotal: 494,
    tax: 24.70,
    total: 518.70,
    items: [
      { productId: "prod-001", barcode: "8901262010053", name: "Amul Taaza Toned Milk (1 Litre)", unitPrice: 72, quantity: 2, lineTotal: 144 },
      { productId: "prod-007", barcode: "8901063012015", name: "Britannia Good Day Butter Cookies (200g)", unitPrice: 40, quantity: 2, lineTotal: 80 },
      { productId: "prod-002", barcode: "8901030382012", name: "Aashirvaad Shudh Chakki Atta (5kg)", unitPrice: 265, quantity: 1, lineTotal: 265 }
    ]
  },
  {
    id: "TXN-9017",
    timestamp: getDateDaysAgo(3, 17, 0),
    cashierName: "Rajesh Sharma",
    registerId: "POS-01",
    paymentMethod: "UPI",
    subtotal: 435,
    tax: 21.75,
    total: 456.75,
    items: [
      { productId: "prod-004", barcode: "8906007280014", name: "Fortune Sunlite Refined Sunflower Oil (1L)", unitPrice: 145, quantity: 2, lineTotal: 290 },
      { productId: "prod-004", barcode: "8906007280014", name: "Fortune Sunlite Refined Sunflower Oil (1L)", unitPrice: 145, quantity: 1, lineTotal: 145 }
    ]
  }
];

export const SEED_PURCHASE_ORDERS = [
  {
    id: "PO-4011",
    productId: "prod-001",
    createdAt: getDateDaysAgo(1, 9, 30),
    supplierName: "Gujarat Co-op Milk Federation (Amul)",
    items: [
      { productId: "prod-001", name: "Amul Taaza Toned Milk (1 Litre)", quantity: 24, unitCost: 58, totalCost: 1392 }
    ],
    totalCost: 1392,
    status: "In Transit",
    expectedDelivery: getDateDaysAgo(-1, 10, 0),
    notes: "Daily automated replenishment order."
  }
];
